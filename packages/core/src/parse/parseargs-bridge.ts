/**
 * @runa-cmd/core — util.parseArgs bridge
 *
 * Converts schema walker metadata + option meta into a valid
 * util.parseArgs configuration object.
 */
import type { ParseArgsConfig } from 'node:util';
import type { OptionMeta, ParamMetadata } from '../types.js';

// ─── Types ──────────────────────────────────────────────────

export interface ParseArgsBridgeConfig {
	parseArgsConfig: ParseArgsConfig;
	/** Maps long alias names → canonical option name */
	longAliasMap: Record<string, string>;
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

	for (const param of metadata) {
		// Map Zod type → parseArgs type
		// boolean → 'boolean' (enables --no-* negation)
		// everything else → 'string' (Zod handles coercion later)
		const parseArgsType: 'string' | 'boolean' = param.zodType === 'boolean' ? 'boolean' : 'string';

		const optConfig: {
			type: 'string' | 'boolean';
			short?: string;
			multiple?: boolean;
			default?: string | boolean | string[] | boolean[];
		} = {
			type: parseArgsType,
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
					options[longName] = { type: parseArgsType };
				} else if (alias.startsWith('-') && alias.length === 2) {
					// Short alias: single char after '-'
					optConfig.short = alias[1];
				}
			}
		}

		// Set boolean defaults so parseArgs returns them correctly
		// For booleans with defaults, pass the default to parseArgs
		if (parseArgsType === 'boolean' && param.defaultValue !== undefined) {
			optConfig.default = param.defaultValue as boolean;
		}

		options[param.name] = optConfig;
	}

	return {
		parseArgsConfig: {
			options,
			allowPositionals: hasArgs ?? false,
			strict: false, // Let Zod handle unknown option errors
			allowNegative: true, // Enable --no-* boolean negation
		},
		longAliasMap,
	};
}
