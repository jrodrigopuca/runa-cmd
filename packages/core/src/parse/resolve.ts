/**
 * @runa-cmd/core — Value resolution pipeline
 *
 * Merge priority: CLI args > env vars > config file > Zod defaults.
 * Maps positionals to args by insertion order.
 * Pre-coerces number strings before Zod .parse().
 */
import { ZodError, type ZodType, z } from 'zod';
import { ValidationError } from '../errors.js';
import type { OptionMeta, ParamMetadata } from '../types.js';
import { walkSchema } from './schema-walker.js';
import { isVariadic } from './variadic.js';

// ─── Types ──────────────────────────────────────────────────

export interface ParseArgsResult {
	values: Record<string, unknown>;
	positionals: string[];
}

export interface ResolveInput {
	/** Raw output from util.parseArgs */
	parseArgsResult: ParseArgsResult;
	/** Long alias map from parseargs-bridge */
	longAliasMap?: Record<string, string>;
	/** Command schemas */
	schemas: {
		args?: Record<string, ZodType>;
		options?: Record<string, ZodType>;
	};
	/** Option metadata (for env var mapping) */
	meta?: { options?: Record<string, OptionMeta> };
	/** Config file values */
	configValues?: Record<string, unknown>;
	/** Environment variables (defaults to process.env, injectable for testing) */
	env?: Record<string, string | undefined>;
}

export interface ResolveOutput {
	parsedArgs: Record<string, unknown>;
	parsedOptions: Record<string, unknown>;
}

// ─── Positional Mapping ─────────────────────────────────────

function mapPositionals(
	positionals: string[],
	argsSchemas: Record<string, ZodType>,
): Record<string, unknown> {
	const keys = Object.keys(argsSchemas);
	const result: Record<string, unknown> = {};

	if (keys.length === 0) {
		// No args defined but positionals provided
		if (positionals.length > 0) {
			throw new ValidationError([
				{
					code: 'custom',
					message: `Unexpected positional argument: '${positionals[0]}'`,
					path: [],
				},
			]);
		}
		return result;
	}

	// Check if last arg is variadic
	const lastKey = keys[keys.length - 1];
	if (!lastKey) return result;
	const lastSchema = argsSchemas[lastKey];
	const lastIsVariadic = lastSchema ? isVariadic(lastSchema) : false;
	const fixedCount = lastIsVariadic ? keys.length - 1 : keys.length;

	// Check for extra positionals without variadic
	if (!lastIsVariadic && positionals.length > keys.length) {
		throw new ValidationError([
			{
				code: 'custom',
				message: `Unexpected positional argument: '${positionals[keys.length]}'`,
				path: [],
			},
		]);
	}

	// Map fixed positionals
	for (let i = 0; i < fixedCount; i++) {
		const key = keys[i];
		if (!key) continue;
		if (i < positionals.length) {
			result[key] = positionals[i];
		}
		// If not provided, omit — let Zod handle required/optional validation
	}

	// Map variadic (remaining positionals go to last key as array)
	if (lastIsVariadic) {
		result[lastKey] = positionals.slice(fixedCount);
	}

	return result;
}

// ─── Value Resolution ───────────────────────────────────────

/**
 * Pre-coerce a string to a number for z.number() fields.
 * Empty/whitespace-only strings are returned UNCHANGED — Number('') === 0
 * and Number('  ') === 0 would silently fabricate a value. Leaving the
 * string intact lets Zod reject it as invalid_type, which flows through
 * the existing humanizer to a ValidationError (exit 2).
 *
 * The single coercion site for ALL resolution sources (CLI arg, env var,
 * config value) — a new source added later inherits the rule by construction.
 *
 * Exported for unit testing only — not part of the public API (not in index.ts).
 */
export function coerceNumberValue(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	if (value.trim() === '') return value;
	const num = Number(value);
	return Number.isNaN(num) ? value : num;
}

function resolveOptionValues(
	parseArgsValues: Record<string, unknown>,
	longAliasMap: Record<string, string>,
	optionsSchemas: Record<string, ZodType>,
	optionsMeta: Record<string, OptionMeta> | undefined,
	configValues: Record<string, unknown> | undefined,
	env: Record<string, string | undefined>,
	optionsMetadata: ParamMetadata[],
): Record<string, unknown> {
	const resolved: Record<string, unknown> = {};

	// Build a set of number fields for pre-coercion
	const numberFields = new Set<string>();
	for (const meta of optionsMetadata) {
		if (meta.zodType === 'number') {
			numberFields.add(meta.name);
		}
	}

	// First, apply long alias mappings to parseArgs values
	const normalizedValues: Record<string, unknown> = { ...parseArgsValues };
	for (const [alias, canonical] of Object.entries(longAliasMap)) {
		if (alias in normalizedValues && !(canonical in normalizedValues)) {
			normalizedValues[canonical] = normalizedValues[alias];
			delete normalizedValues[alias];
		}
	}

	for (const key of Object.keys(optionsSchemas)) {
		// Priority 1: CLI arg
		if (key in normalizedValues && normalizedValues[key] !== undefined) {
			const value = normalizedValues[key];
			resolved[key] = numberFields.has(key) ? coerceNumberValue(value) : value;
			continue;
		}

		// Priority 2: Environment variable
		const envName = optionsMeta?.[key]?.env;
		if (envName && envName in env && env[envName] !== undefined) {
			const value: unknown = env[envName];
			resolved[key] = numberFields.has(key) ? coerceNumberValue(value) : value;
			continue;
		}

		// Priority 3: Config file value
		if (configValues && key in configValues && configValues[key] !== undefined) {
			const value = configValues[key];
			resolved[key] = numberFields.has(key) ? coerceNumberValue(value) : value;
		}

		// Priority 4: Omit — let Zod .default() handle it
	}

	return resolved;
}

// ─── Human-friendly error messages ──────────────────────────

type ZodIssue = z.core.$ZodIssue;

/**
 * Rewrite Zod issues into user-friendly CLI error messages.
 * Handles common cases: missing required args/options, invalid enums, wrong types.
 */
function humanizeArgIssues(issues: ZodIssue[], argsSchemas: Record<string, ZodType>): ZodIssue[] {
	const metadata = walkSchema(argsSchemas);
	const metaByName = new Map(metadata.map((m) => [m.name, m]));

	return issues.map((issue) => {
		const name = issue.path[0];
		if (typeof name !== 'string') return issue;
		const param = metaByName.get(name);

		// Missing required arg: Zod v4 produces "Invalid input: expected X, received undefined"
		if (issue.code === 'invalid_type' && issue.message.includes('received undefined')) {
			return {
				code: 'custom' as const,
				message: `Missing required argument: <${name}>${param?.description ? ` — ${param.description}` : ''}`,
				path: issue.path,
			};
		}

		// Invalid enum value (Zod v4 uses 'invalid_value' for enums)
		if (issue.code === 'invalid_value' && param?.enumValues) {
			return {
				code: 'custom' as const,
				message: `Invalid value for <${name}>. Expected one of: ${param.enumValues.join(', ')}`,
				path: issue.path,
			};
		}

		return issue;
	});
}

function humanizeOptionIssues(
	issues: ZodIssue[],
	optionsSchemas: Record<string, ZodType>,
): ZodIssue[] {
	const metadata = walkSchema(optionsSchemas);
	const metaByName = new Map(metadata.map((m) => [m.name, m]));

	return issues.map((issue) => {
		const name = issue.path[0];
		if (typeof name !== 'string') return issue;
		const param = metaByName.get(name);

		// Missing required option
		if (issue.code === 'invalid_type' && issue.message.includes('received undefined')) {
			return {
				code: 'custom' as const,
				message: `Missing required option: --${name}${param?.description ? ` — ${param.description}` : ''}`,
				path: issue.path,
			};
		}

		// Invalid enum value
		if (issue.code === 'invalid_value' && param?.enumValues) {
			return {
				code: 'custom' as const,
				message: `Invalid value for --${name}. Expected one of: ${param.enumValues.join(', ')}`,
				path: issue.path,
			};
		}

		// Wrong type (e.g. expected number, got string)
		if (issue.code === 'invalid_type') {
			const expected = (issue as unknown as Record<string, unknown>).expected;
			return {
				code: 'custom' as const,
				message: `Invalid value for --${name}: expected ${String(expected)}`,
				path: issue.path,
			};
		}

		return issue;
	});
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Resolve values from all sources and validate through Zod.
 *
 * Pipeline:
 * 1. Map positionals to args by insertion order
 * 2. Merge option values (CLI > env > config)
 * 3. Pre-coerce number strings
 * 4. Validate through Zod schemas
 * 5. Return typed results or throw ValidationError
 */
export function resolveValues(input: ResolveInput): ResolveOutput {
	const {
		parseArgsResult,
		longAliasMap = {},
		schemas,
		meta,
		configValues,
		env = process.env as Record<string, string | undefined>,
	} = input;

	// ─── Args resolution ─────────────────────────────────
	let parsedArgs: Record<string, unknown> = {};

	if (schemas.args && Object.keys(schemas.args).length > 0) {
		const rawArgs = mapPositionals(parseArgsResult.positionals, schemas.args);

		// Build Zod object schema for args and validate
		const argsZodSchema = z.object(schemas.args as Record<string, ZodType>);
		try {
			parsedArgs = argsZodSchema.parse(rawArgs) as Record<string, unknown>;
		} catch (err) {
			if (err instanceof ZodError) {
				throw new ValidationError(humanizeArgIssues(err.issues, schemas.args));
			}
			throw err;
		}
	}

	// ─── Options resolution ──────────────────────────────
	let parsedOptions: Record<string, unknown> = {};

	if (schemas.options && Object.keys(schemas.options).length > 0) {
		const optionsMetadata = walkSchema(schemas.options);
		const rawOptions = resolveOptionValues(
			parseArgsResult.values,
			longAliasMap,
			schemas.options,
			meta?.options,
			configValues,
			env,
			optionsMetadata,
		);

		// Build Zod object schema for options and validate
		const optionsZodSchema = z.object(schemas.options as Record<string, ZodType>);
		try {
			parsedOptions = optionsZodSchema.parse(rawOptions) as Record<string, unknown>;
		} catch (err) {
			if (err instanceof ZodError) {
				throw new ValidationError(humanizeOptionIssues(err.issues, schemas.options));
			}
			throw err;
		}
	}

	return { parsedArgs, parsedOptions };
}
