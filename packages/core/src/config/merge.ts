/**
 * @runa-cmd/core — Config loading orchestration
 *
 * Searches for a config file using registered loaders and loads it. What each
 * key means is in scope.ts, and the merge priority (CLI > env > config >
 * defaults) is handled in resolve.ts.
 */
import { ConfigError } from '../errors.js';
import type { CLIConfigOptions, ConfigLoader } from '../types.js';
import { jsonLoader } from './loader.js';
import { searchConfig } from './search.js';

// ─── Public API ─────────────────────────────────────────────

export interface ConfigFile {
	/** Where it was found, to name it in errors */
	filePath: string;
	values: Record<string, unknown>;
}

/**
 * Load the config file, if there is one.
 *
 * 1. Combines built-in JSON loader with any additional loaders
 * 2. Searches configured paths for matching config files
 * 3. Loads the first match, which must be a plain object
 * 4. Returns undefined if no config file found
 */
export async function loadConfigFile(
	configOptions: CLIConfigOptions,
): Promise<ConfigFile | undefined> {
	// Combine built-in JSON loader with additional loaders
	const builtInLoader = jsonLoader();
	const allLoaders = [builtInLoader, ...(configOptions.loaders ?? [])];

	// Default search paths: current dir, then home dir
	const searchPaths = configOptions.searchPaths ?? ['.', '~'];

	// Search for config file
	const result = await searchConfig(configOptions.name, allLoaders, searchPaths);

	if (!result) {
		return undefined;
	}

	const { filePath, loader } = result;
	const values = await load(loader, filePath);

	if (values === null || typeof values !== 'object' || Array.isArray(values)) {
		const found = Array.isArray(values) ? 'array' : typeof values;
		throw new ConfigError(`${filePath}: expected an object, got ${found}.`);
	}

	return { filePath, values: values as Record<string, unknown> };
}

async function load(loader: ConfigLoader, filePath: string): Promise<unknown> {
	try {
		return await loader.load(filePath);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new ConfigError(reason.includes(filePath) ? reason : `${filePath}: ${reason}`);
	}
}
