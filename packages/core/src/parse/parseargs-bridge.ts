/**
 * @runa-cmd/core — util.parseArgs bridge
 *
 * Converts schema walker metadata + option meta into a valid
 * util.parseArgs configuration object.
 */
import type { ParseArgsConfig } from 'node:util';
import { flagName } from '../flag-name.js';
import type { OptionMeta, ParamMetadata } from '../types.js';

// ─── Types ──────────────────────────────────────────────────

export interface ParseArgsBridgeConfig {
	parseArgsConfig: ParseArgsConfig;
	/** Maps long alias names → canonical option name */
	longAliasMap: Record<string, string>;
	/**
	 * Every key util.parseArgs may legitimately produce for this config:
	 * canonical option names + registered long aliases, plus a defensive
	 * `no-{name}` per boolean option (parseArgs folds `--no-x` into `x: false`
	 * under allowNegative — pinned by parseargs-negation.test.ts — but the
	 * allowance guards against a future representation change).
	 */
	knownKeys: Set<string>;
	/** Canonical names of boolean options (for the strict check's `no-*` allowance) */
	booleanKeys: Set<string>;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Build a util.parseArgs configuration from schema walker output.
 *
 * @param metadata - Parameter metadata from schema walker (for options only)
 * @param optionMeta - OptionMeta from meta.options (aliases, env, etc.)
 * @param hasArgs - Whether the command has positional args
 */
export function buildParseArgsConfig(
	metadata: ParamMetadata[],
	optionMeta?: Record<string, OptionMeta>,
	hasArgs?: boolean,
): ParseArgsBridgeConfig {
	const options: NonNullable<ParseArgsConfig['options']> = {};
	const longAliasMap: Record<string, string> = {};
	const knownKeys = new Set<string>();
	const booleanKeys = new Set<string>();

	for (const param of metadata) {
		// Map Zod type → parseArgs type
		// boolean → 'boolean' (enables --no-* negation)
		// everything else → 'string' (Zod handles coercion later)
		const parseArgsType: 'string' | 'boolean' = param.zodType === 'boolean' ? 'boolean' : 'string';

		const optConfig: {
			type: 'string' | 'boolean';
			short?: string;
			multiple?: boolean;
		} = {
			type: parseArgsType,
			...(param.isArray ? { multiple: true } : {}),
		};

		// Extract aliases from meta
		const meta = optionMeta?.[param.name];
		if (meta?.alias) {
			for (const alias of meta.alias) {
				if (alias.startsWith('--')) {
					// Long alias: register as a separate option pointing to the same name
					const longName = alias.slice(2);
					longAliasMap[longName] = param.name;
					// Register the long alias in parseArgs too
					options[longName] = { type: parseArgsType, ...(param.isArray ? { multiple: true } : {}) };
					knownKeys.add(longName);
				} else if (alias.startsWith('-') && alias.length === 2) {
					// Short alias: single char after '-'
					optConfig.short = alias[1];
				}
			}
		}

		// The flag is registered, not the key: `--darkColor` must stay unknown.
		// It maps back like any long alias, so `--no-dark-mode` needs nothing else.
		const flag = flagName(param.name);
		if (flag !== param.name) longAliasMap[flag] = param.name;

		// Never pass schema defaults here: a value from parseArgs counts as a CLI
		// argument and would beat env and config. Zod applies them last.
		options[flag] = optConfig;
		knownKeys.add(flag);
		if (parseArgsType === 'boolean') {
			booleanKeys.add(flag);
			knownKeys.add(`no-${flag}`);
		}
	}

	return {
		parseArgsConfig: {
			options,
			allowPositionals: hasArgs ?? false,
			strict: false, // Let Zod handle unknown option errors
			allowNegative: true, // Enable --no-* boolean negation
		},
		longAliasMap,
		knownKeys,
		booleanKeys,
	};
}
