/**
 * @runa-cmd/core — Deprecated option warnings
 *
 * `meta.options[name].deprecated` declares the notice once. It is shown in help
 * and, through this module, whenever the option is actually used.
 */
import type { OptionMeta } from '../types.js';

export interface DeprecationInput {
	/** Keys of the util.parseArgs result: holds only what the user passed */
	provided: string[];
	longAliasMap: Record<string, string>;
	optionMeta?: Record<string, OptionMeta>;
	configValues?: Record<string, unknown>;
	env?: Record<string, string | undefined>;
}

/** The warnings for every deprecated option set from the CLI, env or config. */
export function deprecationWarnings(input: DeprecationInput): string[] {
	const { provided, longAliasMap, optionMeta, configValues, env = process.env } = input;
	const fromCli = new Set(provided.map((key) => longAliasMap[key] ?? key));

	return Object.entries(optionMeta ?? {}).flatMap(([name, meta]) => {
		if (!meta.deprecated) return [];

		const isUsed =
			fromCli.has(name) ||
			(meta.env !== undefined && env[meta.env] !== undefined) ||
			configValues?.[name] !== undefined;

		return isUsed ? [`Warning: --${name} is deprecated. ${meta.deprecated}`] : [];
	});
}
