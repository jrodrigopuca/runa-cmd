/**
 * @runa-cmd/core — Zod v4 SchemaAdapter
 *
 * The ONLY module in the package that touches Zod v4 internals (`._zod.def`).
 * If Zod changes internals, only this file needs updating — the confinement
 * is enforced by a meta-test walking `packages/core/src`.
 *
 * All introspection logic (wrapper unwrapping, base-type detection, enum
 * entries extraction, default extraction) lives here; `schema-walker.ts`
 * and `variadic.ts` are thin delegates over `describe()`.
 */
import type { ZodType } from 'zod';
import type { ParamType } from '../../types.js';
import type { SchemaAdapter, SchemaDescription } from '../schema-adapter.js';

// ─── Zod v4 internal types ─────────────────────────────────
// These reflect the shape of `schema._zod.def` in Zod v4.
// We type them loosely to avoid coupling to exact Zod internals.

interface ZodDef {
	type: string;
	[key: string]: unknown;
}

/** Zod v4 def for wrapper types (optional, default, nullable) */
interface ZodWrapperDef extends ZodDef {
	innerType: ZodType;
}

/** Zod v4 def for default wrapper */
interface ZodDefaultDef extends ZodWrapperDef {
	defaultValue: unknown;
}

/** Zod v4 def for enum type */
interface ZodEnumDef extends ZodDef {
	entries: Record<string, string>;
}

interface ZodInternals {
	def: ZodDef;
}

interface ZodSchemaWithInternals {
	_zod: ZodInternals;
	description?: string;
}

// ─── Helper: access ._zod.def safely ───────────────────────

function getZodDef(schema: ZodType): ZodDef {
	const s = schema as unknown as ZodSchemaWithInternals;
	if (!s._zod?.def) {
		throw new Error(
			'Cannot introspect Zod schema: ._zod.def is missing. Ensure you are using Zod v4.',
		);
	}
	return s._zod.def;
}

function getDescription(schema: ZodType): string | undefined {
	const s = schema as unknown as ZodSchemaWithInternals;
	return s.description;
}

// ─── Unwrap layers ──────────────────────────────────────────
// Zod v4 wraps schemas in layers: ZodOptional, ZodDefault, ZodNullable, etc.
// We need to unwrap to find the base type and extract metadata along the way.

interface UnwrapResult {
	baseDef: ZodDef;
	isOptional: boolean;
	hasDefault: boolean;
	defaultValue: unknown;
	description?: string;
}

function unwrapSchema(schema: ZodType): UnwrapResult {
	let isOptional = false;
	let defaultValue: unknown;
	let hasDefault = false;
	let description = getDescription(schema);
	let current = schema;

	// Iteratively unwrap layers
	const maxDepth = 10; // safety limit
	for (let i = 0; i < maxDepth; i++) {
		const def = getZodDef(current);

		if (def.type === 'optional') {
			isOptional = true;
			current = (def as ZodWrapperDef).innerType;
			if (!description) description = getDescription(current);
			continue;
		}

		if (def.type === 'default') {
			isOptional = true; // defaults make the field optional from the user's perspective
			hasDefault = true;
			defaultValue = (def as ZodDefaultDef).defaultValue;
			current = (def as ZodWrapperDef).innerType;
			if (!description) description = getDescription(current);
			continue;
		}

		if (def.type === 'nullable') {
			current = (def as ZodWrapperDef).innerType;
			if (!description) description = getDescription(current);
			continue;
		}

		// Base type reached
		break;
	}

	return {
		baseDef: getZodDef(current),
		isOptional,
		hasDefault,
		defaultValue: hasDefault ? defaultValue : undefined,
		description,
	};
}

// ─── Detect base type ───────────────────────────────────────

function detectParamType(def: ZodDef): { kind: ParamType; enumValues?: string[] } {
	switch (def.type) {
		case 'string':
			return { kind: 'string' };
		case 'number':
		case 'int':
			return { kind: 'number' };
		case 'boolean':
			return { kind: 'boolean' };
		case 'enum': {
			// Zod v4 uses `entries` (object { staging: 'staging', prod: 'prod' })
			// not `values` (array). Extract the values from the entries object.
			const entries = (def as ZodEnumDef).entries;
			const values = entries ? Object.values(entries) : undefined;
			return { kind: 'enum', enumValues: values };
		}
		case 'array':
			return { kind: 'array' };
		default:
			// Fallback: treat unknown types as string
			return { kind: 'string' };
	}
}

// ─── Adapter ────────────────────────────────────────────────

export const zodV4Adapter: SchemaAdapter = {
	name: 'zod-v4',

	supports(schema: unknown): boolean {
		if (schema === null || (typeof schema !== 'object' && typeof schema !== 'function')) {
			return false;
		}
		const s = schema as Partial<ZodSchemaWithInternals>;
		return s._zod?.def !== undefined;
	},

	describe(schema: ZodType): SchemaDescription {
		const { baseDef, isOptional, hasDefault, defaultValue, description } = unwrapSchema(schema);
		const { kind, enumValues } = detectParamType(baseDef);

		return {
			kind,
			isOptional,
			hasDefault,
			defaultValue,
			enumValues,
			description,
		};
	},
};
