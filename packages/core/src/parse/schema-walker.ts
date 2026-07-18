/**
 * @runa-cmd/core — Zod Schema Walker
 *
 * Walks Zod schemas to extract parameter metadata (type, default, required,
 * description, enum values, variadic). Introspection is delegated to the
 * SchemaAdapter seam (see `schema-adapter.ts`); this module only maps
 * `SchemaDescription` onto the `ParamMetadata` shape.
 */
import type { ZodType } from 'zod';
import type { ParamMetadata } from '../types.js';
import { defaultAdapter } from './schema-adapter.js';

function toParamMetadata(name: string, schema: ZodType): ParamMetadata {
	const desc = defaultAdapter.describe(schema);

	return {
		name,
		zodType: desc.kind,
		isOptional: desc.isOptional,
		defaultValue: desc.defaultValue,
		isArray: desc.kind === 'array',
		enumValues: desc.enumValues,
		description: desc.description,
	};
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Walk a record of Zod schemas and extract parameter metadata for each key.
 * Keys are returned in insertion order (Object.entries preserves it).
 */
export function walkSchema(schemas: Record<string, ZodType>): ParamMetadata[] {
	return Object.entries(schemas).map(([name, schema]) => toParamMetadata(name, schema));
}

/**
 * Walk a single Zod schema and extract its metadata.
 * Used by other modules that need to inspect individual schemas.
 */
export function walkSingleSchema(name: string, schema: ZodType): ParamMetadata {
	return toParamMetadata(name, schema);
}
