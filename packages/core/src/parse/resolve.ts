/**
 * @runa-cmd/core — Value resolution pipeline
 *
 * Merge priority: CLI args > env vars > config file > Zod defaults.
 * Maps positionals to args by insertion order.
 * Pre-coerces number and boolean strings before Zod .parse().
 */
import { ZodError, type ZodType, z } from 'zod';
import { ValidationError } from '../errors.js';
import { longFlag } from '../flag-name.js';
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

/**
 * Decide which tokens after `--` are operands and which stay in ctx.rest
 * (ADR-0036): they fill the positionals still empty, where a variadic counts
 * as one. So `lint -- -a -b` fills `files`, while `lint a.ts -- --fix` keeps
 * `--fix` for ctx.rest.
 */
export function distributeRest(
	positionals: string[],
	rest: string[],
	argsSchemas: Record<string, ZodType>,
): { positionals: string[]; rest: string[] } {
	const keys = Object.keys(argsSchemas);
	const free = Math.max(0, keys.length - positionals.length);
	const lastSchema = argsSchemas[keys.at(-1) ?? ''];
	const fillsVariadic = free > 0 && lastSchema !== undefined && isVariadic(lastSchema);
	const taken = fillsVariadic ? rest.length : free;

	return {
		positionals: [...positionals, ...rest.slice(0, taken)],
		rest: rest.slice(taken),
	};
}

// ─── Value Resolution ───────────────────────────────────────

/**
 * Pre-coerce a string to a number for z.number() fields.
 * Empty/whitespace-only strings are returned UNCHANGED — Number('') === 0
 * and Number('  ') === 0 would silently fabricate a value. Leaving the
 * string intact lets Zod reject it as invalid_type, which flows through
 * the existing humanizer to a ValidationError (exit 2).
 *
 * Exported for unit testing only — not part of the public API (not in index.ts).
 */
export function coerceNumberValue(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	if (value.trim() === '') return value;
	const num = Number(value);
	return Number.isNaN(num) ? value : num;
}

/**
 * Pre-coerce a string to a boolean for z.boolean() fields. Env vars are always
 * strings, and `--flag=false` also reaches here as one. Anything but
 * true/false/1/0 is returned UNCHANGED so Zod rejects it instead of guessing:
 * `MINIFY=quizas` must not silently mean either value.
 *
 * Exported for unit testing only — not part of the public API (not in index.ts).
 */
export function coerceBooleanValue(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'true' || normalized === '1') return true;
	if (normalized === 'false' || normalized === '0') return false;
	return value;
}

/** The single coercion site for ALL resolution sources (CLI arg, env var, config value). */
function coerceByType(value: unknown, type: ParamMetadata['zodType'] | undefined): unknown {
	if (type === 'number') return coerceNumberValue(value);
	if (type === 'boolean') return coerceBooleanValue(value);
	return value;
}

function coerceField(value: unknown, field: ParamMetadata | undefined): unknown {
	if (!field?.isArray) return coerceByType(value, field?.zodType);
	if (!Array.isArray(value)) return value;
	return value.map((item) => coerceByType(item, field.itemType));
}

/** An env var is one string, and a list needs a rule (ADR-0035). */
function splitEnvList(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
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

	const fields = new Map(optionsMetadata.map((meta) => [meta.name, meta]));

	// First, apply long alias mappings to parseArgs values
	const normalizedValues: Record<string, unknown> = { ...parseArgsValues };
	for (const [alias, canonical] of Object.entries(longAliasMap)) {
		if (!(alias in normalizedValues)) continue;

		const own = normalizedValues[canonical];
		const viaAlias = normalizedValues[alias];
		if (own === undefined) normalizedValues[canonical] = viaAlias;
		// Two names for one list: every value counts
		else if (Array.isArray(own) && Array.isArray(viaAlias)) {
			normalizedValues[canonical] = [...own, ...viaAlias];
		}
		delete normalizedValues[alias];
	}

	for (const key of Object.keys(optionsSchemas)) {
		const field = fields.get(key);

		// Priority 1: CLI arg
		if (key in normalizedValues && normalizedValues[key] !== undefined) {
			resolved[key] = coerceField(normalizedValues[key], field);
			continue;
		}

		// Priority 2: Environment variable
		const envName = optionsMeta?.[key]?.env;
		const envValue = envName ? env[envName] : undefined;
		if (envValue !== undefined) {
			resolved[key] = coerceField(field?.isArray ? splitEnvList(envValue) : envValue, field);
			continue;
		}

		// Priority 3: Config file value
		if (configValues && key in configValues && configValues[key] !== undefined) {
			resolved[key] = coerceField(configValues[key], field);
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
				message: `Missing required argument: <${name}>`,
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
				message: `Missing required option: ${longFlag(name)}`,
				path: issue.path,
			};
		}

		// Invalid enum value
		if (issue.code === 'invalid_value' && param?.enumValues) {
			return {
				code: 'custom' as const,
				message: `Invalid value for ${longFlag(name)}. Expected one of: ${param.enumValues.join(', ')}`,
				path: issue.path,
			};
		}

		// Wrong type (e.g. expected number, got string)
		if (issue.code === 'invalid_type') {
			const expected = (issue as unknown as Record<string, unknown>).expected;
			return {
				code: 'custom' as const,
				message: `Invalid value for ${longFlag(name)}: expected ${String(expected)}`,
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

	// Mapped even without declared args: that's what rejects extra positionals.
	const argSchemas = schemas.args ?? {};
	const rawArgs = mapPositionals(parseArgsResult.positionals, argSchemas);

	return {
		parsedArgs: validateArgs(rawArgs, argSchemas),
		parsedOptions: validateOptions(
			parseArgsResult.values,
			longAliasMap,
			schemas.options,
			meta?.options,
			configValues,
			env,
		),
	};
}

export interface ResolveToolInput {
	/** The call's arguments, as one object */
	input: Record<string, unknown>;
	schemas: ResolveInput['schemas'];
	meta?: ResolveInput['meta'];
	configValues?: Record<string, unknown>;
	env?: Record<string, string | undefined>;
}

/**
 * Same resolution as resolveValues, from an object instead of parsed argv. Each
 * key names its target, so there are no positions, tokens or aliases to read:
 * arrays, objects and numbers arrive as they are, and data is never a route.
 */
export function resolveToolInput(toolInput: ResolveToolInput): ResolveOutput {
	const {
		input,
		schemas,
		meta,
		configValues,
		env = process.env as Record<string, string | undefined>,
	} = toolInput;

	const argSchemas = schemas.args ?? {};
	const optionSchemas = schemas.options ?? {};
	const rawArgs: Record<string, unknown> = {};
	const rawOptions: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(input)) {
		if (Object.hasOwn(argSchemas, key)) rawArgs[key] = value;
		else if (Object.hasOwn(optionSchemas, key)) rawOptions[key] = value;
		else {
			throw new ValidationError([{ code: 'custom', message: `Unknown input: ${key}`, path: [] }]);
		}
	}

	return {
		parsedArgs: validateArgs(rawArgs, argSchemas),
		parsedOptions: validateOptions(
			rawOptions,
			{},
			schemas.options,
			meta?.options,
			configValues,
			env,
		),
	};
}

function validateArgs(
	rawArgs: Record<string, unknown>,
	argSchemas: Record<string, ZodType>,
): Record<string, unknown> {
	if (Object.keys(argSchemas).length === 0) return {};

	try {
		return z.object(argSchemas).parse(rawArgs) as Record<string, unknown>;
	} catch (err) {
		if (err instanceof ZodError) {
			throw new ValidationError(humanizeArgIssues(err.issues, argSchemas));
		}
		throw err;
	}
}

function validateOptions(
	values: Record<string, unknown>,
	longAliasMap: Record<string, string>,
	optionSchemas: Record<string, ZodType> | undefined,
	optionsMeta: Record<string, OptionMeta> | undefined,
	configValues: Record<string, unknown> | undefined,
	env: Record<string, string | undefined>,
): Record<string, unknown> {
	if (!optionSchemas || Object.keys(optionSchemas).length === 0) return {};

	const rawOptions = resolveOptionValues(
		values,
		longAliasMap,
		optionSchemas,
		optionsMeta,
		configValues,
		env,
		walkSchema(optionSchemas),
	);

	try {
		return z.object(optionSchemas).parse(rawOptions) as Record<string, unknown>;
	} catch (err) {
		if (err instanceof ZodError) {
			throw new ValidationError(humanizeOptionIssues(err.issues, optionSchemas));
		}
		throw err;
	}
}
