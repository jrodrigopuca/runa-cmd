/**
 * @runa-cmd/core — defineCommand()
 *
 * Builder function that creates a typed, branded Command object from
 * a CommandConfig. Validates variadic args and meta.options keys at
 * definition time.
 */
import { type ZodType, z } from 'zod';
import { RunaError } from './errors.js';
import { validateVariadicArgs } from './parse/variadic.js';
import type { Command, CommandConfig, CommandMeta, OptionMeta, RunContext } from './types.js';

/** The option a command with format gains. It's for the terminal: a tool never sees it. */
export const JSON_OPTION = 'json';
export const JSON_SCHEMA = z.boolean().optional();

// ─── Definition-time validation ─────────────────────────────

/**
 * Validate that keys in meta.options are a subset of the options schema keys.
 * This is a runtime complement to TypeScript's compile-time constraint.
 */
function validateMetaOptionsKeys<TOptions extends Record<string, ZodType>>(
	meta: CommandMeta<TOptions>,
	options?: TOptions,
): void {
	if (!meta.options) return;

	const optionKeys = options ? new Set(Object.keys(options)) : new Set<string>();

	for (const key of Object.keys(meta.options)) {
		if (!optionKeys.has(key)) {
			throw new RunaError(
				`meta.options contains key '${key}' that is not defined in options. ` +
					`Available keys: ${optionKeys.size > 0 ? [...optionKeys].map((k) => `'${k}'`).join(', ') : '(none)'}.`,
				{ code: 'INVALID_META_OPTIONS', exitCode: 1 },
			);
		}
	}
}

/** A command with format gets `--json`, so nothing else can claim that flag. */
function validateJsonFlag<TOptions extends Record<string, ZodType>>(
	meta: CommandMeta<TOptions>,
	options?: TOptions,
): void {
	const optionMeta = (meta.options ?? {}) as Record<string, OptionMeta>;
	const claimed =
		Object.hasOwn(options ?? {}, JSON_OPTION) ||
		Object.values(optionMeta).some((option) => option.alias?.includes(`--${JSON_OPTION}`));

	if (claimed) {
		throw new RunaError(`A command with format already has --${JSON_OPTION}. Rename its option.`, {
			code: 'OPTION_COLLISION',
			exitCode: 1,
		});
	}
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Create a typed Command from a CommandConfig.
 *
 * Validates at definition time:
 * - Variadic args (z.array()) must be the last positional arg
 * - meta.options keys must be a subset of options keys
 *
 * Returns a branded Command object with full generic inference preserved.
 */
export function defineCommand<
	TArgs extends Record<string, ZodType> = Record<string, ZodType>,
	TOptions extends Record<string, ZodType> = Record<string, ZodType>,
	TOutput extends ZodType | undefined = undefined,
	TResult = void,
>(config: CommandConfig<TArgs, TOptions, TOutput, TResult>): Command {
	// Validate variadic args at definition time
	if (config.args) {
		validateVariadicArgs(config.args as Record<string, ZodType>);
	}

	// Validate meta.options keys match options keys
	validateMetaOptionsKeys(config.meta, config.options);

	if (config.format) validateJsonFlag(config.meta, config.options);

	// Construct branded Command object
	return {
		_type: 'runa:command' as const,
		meta: config.meta as CommandMeta,
		args: config.args as Record<string, ZodType> | undefined,
		options: config.options as Record<string, ZodType> | undefined,
		output: config.output as ZodType | undefined,
		rest: config.rest,
		run: config.run as (ctx: RunContext) => unknown,
		format: config.format as Command['format'],
	};
}
