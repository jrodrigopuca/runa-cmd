/**
 * @runa-cmd/core — SchemaAdapter seam
 *
 * Introspection-only abstraction over schema-library internals (design D1).
 * The adapter answers structural questions (kind, optionality, default,
 * enum values, description) — it does NOT validate; `resolve.ts` keeps
 * calling Zod's `.parse()` directly.
 *
 * The `SchemaAdapter`/`SchemaDescription` types are public (exported from
 * the package barrel) to enable external experimentation, but adapter
 * SELECTION stays internal: no `schemaAdapter` config option ships until
 * a second implementation exists (design D2).
 */
import type { ZodType } from 'zod';
import type { ParamType } from '../types.js';
import { zodV4Adapter } from './adapters/zod-v4.js';

export interface SchemaAdapter {
	/** Adapter identity for diagnostics, e.g. 'zod-v4' */
	readonly name: string;
	/** Whether this adapter can introspect the given schema object */
	supports(schema: unknown): boolean;
	/** Full structural description: unwraps optional/default/nullable internally */
	describe(schema: ZodType): SchemaDescription;
}

export interface SchemaDescription {
	/** Base type kind after unwrapping (int maps to 'number'; unknown falls back to 'string') */
	kind: ParamType;
	/** Optional from the user's perspective: explicitly optional OR carrying a default */
	isOptional: boolean;
	/** Whether a `default` wrapper is present */
	hasDefault: boolean;
	/** The default value; undefined when hasDefault is false */
	defaultValue: unknown;
	/** Enum member values, present only when kind is 'enum' */
	enumValues?: string[];
	/** Schema description, preferring the outermost layer that has one */
	description?: string;
}

/** The adapter used by schema-walker/variadic. Internal — not exported from the barrel. */
export const defaultAdapter: SchemaAdapter = zodV4Adapter;
