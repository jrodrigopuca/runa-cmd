/**
 * @runa-cmd/core — Zod Schema Walker
 *
 * Walks Zod schemas to extract parameter metadata (type, default, required,
 * description, enum values, variadic). This is the ONLY module that accesses
 * Zod v4 internal `._zod.def` — if Zod changes internals, only this file
 * needs updating.
 */
import type { ZodType } from 'zod'
import type { ParamMetadata, ParamType } from '../types.js'

// ─── Zod v4 internal types ─────────────────────────────────
// These reflect the shape of `schema._zod.def` in Zod v4.
// We type them loosely to avoid coupling to exact Zod internals.

interface ZodDef {
  type: string
  [key: string]: unknown
}

interface ZodInternals {
  def: ZodDef
}

interface ZodSchemaWithInternals {
  _zod: ZodInternals
  description?: string
}

// ─── Helper: access ._zod.def safely ───────────────────────

function getZodDef(schema: ZodType): ZodDef {
  const s = schema as unknown as ZodSchemaWithInternals
  if (!s._zod?.def) {
    throw new Error('Cannot introspect Zod schema: ._zod.def is missing. Ensure you are using Zod v4.')
  }
  return s._zod.def
}

function getDescription(schema: ZodType): string | undefined {
  const s = schema as unknown as ZodSchemaWithInternals
  return s.description
}

// ─── Unwrap layers ──────────────────────────────────────────
// Zod v4 wraps schemas in layers: ZodOptional, ZodDefault, ZodNullable, etc.
// We need to unwrap to find the base type and extract metadata along the way.

interface UnwrapResult {
  baseSchema: ZodType
  baseDef: ZodDef
  isOptional: boolean
  defaultValue: unknown
  description?: string
}

function unwrapSchema(schema: ZodType): UnwrapResult {
  let isOptional = false
  let defaultValue: unknown = undefined
  let hasDefault = false
  let description = getDescription(schema)
  let current = schema

  // Iteratively unwrap layers
  const maxDepth = 10 // safety limit
  for (let i = 0; i < maxDepth; i++) {
    const def = getZodDef(current)

    if (def.type === 'optional') {
      isOptional = true
      current = (def as any).innerType as ZodType
      if (!description) description = getDescription(current)
      continue
    }

    if (def.type === 'default') {
      isOptional = true // defaults make the field optional from the user's perspective
      hasDefault = true
      defaultValue = (def as any).defaultValue
      current = (def as any).innerType as ZodType
      if (!description) description = getDescription(current)
      continue
    }

    if (def.type === 'nullable') {
      current = (def as any).innerType as ZodType
      if (!description) description = getDescription(current)
      continue
    }

    // Base type reached
    break
  }

  // If we found a default via the wrapper, keep it.
  // If not, defaultValue stays undefined.
  return {
    baseSchema: current,
    baseDef: getZodDef(current),
    isOptional,
    defaultValue: hasDefault ? defaultValue : undefined,
    description,
  }
}

// ─── Detect base type ───────────────────────────────────────

function detectParamType(def: ZodDef): { zodType: ParamType; enumValues?: string[] } {
  switch (def.type) {
    case 'string':
      return { zodType: 'string' }
    case 'number':
    case 'int':
      return { zodType: 'number' }
    case 'boolean':
      return { zodType: 'boolean' }
    case 'enum': {
      // Zod v4 uses `entries` (object { staging: 'staging', prod: 'prod' })
      // not `values` (array). Extract the values from the entries object.
      const entries = (def as any).entries as Record<string, string> | undefined
      const values = entries ? Object.values(entries) : undefined
      return { zodType: 'enum', enumValues: values }
    }
    case 'array':
      return { zodType: 'array' }
    default:
      // Fallback: treat unknown types as string
      return { zodType: 'string' }
  }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Walk a record of Zod schemas and extract parameter metadata for each key.
 * Keys are returned in insertion order (Object.entries preserves it).
 */
export function walkSchema(schemas: Record<string, ZodType>): ParamMetadata[] {
  const result: ParamMetadata[] = []

  for (const [name, schema] of Object.entries(schemas)) {
    const { baseDef, isOptional, defaultValue, description } = unwrapSchema(schema)
    const { zodType, enumValues } = detectParamType(baseDef)

    result.push({
      name,
      zodType,
      isOptional,
      defaultValue,
      isArray: zodType === 'array',
      enumValues,
      description,
    })
  }

  return result
}

/**
 * Walk a single Zod schema and extract its metadata.
 * Used by other modules that need to inspect individual schemas.
 */
export function walkSingleSchema(name: string, schema: ZodType): ParamMetadata {
  const { baseDef, isOptional, defaultValue, description } = unwrapSchema(schema)
  const { zodType, enumValues } = detectParamType(baseDef)

  return {
    name,
    zodType,
    isOptional,
    defaultValue,
    isArray: zodType === 'array',
    enumValues,
    description,
  }
}
