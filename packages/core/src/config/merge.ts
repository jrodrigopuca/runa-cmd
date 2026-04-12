/**
 * @runa-cmd/core — Config loading orchestration
 *
 * Searches for a config file using registered loaders, loads it,
 * and returns the raw config values. The actual merge priority
 * (CLI > env > config > defaults) is handled in resolve.ts.
 */
import type { CLIConfigOptions } from '../types.js'
import { jsonLoader } from './loader.js'
import { searchConfig } from './search.js'

// ─── Public API ─────────────────────────────────────────────

/**
 * Load config values from a config file, if found.
 *
 * 1. Combines built-in JSON loader with any additional loaders
 * 2. Searches configured paths for matching config files
 * 3. Loads and returns the parsed config
 * 4. Returns undefined if no config file found
 */
export async function loadAndMergeConfig(
  configOptions: CLIConfigOptions,
): Promise<Record<string, unknown> | undefined> {
  // Combine built-in JSON loader with additional loaders
  const builtInLoader = jsonLoader()
  const allLoaders = [builtInLoader, ...(configOptions.loaders ?? [])]

  // Default search paths: current dir, then home dir
  const searchPaths = configOptions.searchPaths ?? ['.', '~']

  // Search for config file
  const result = await searchConfig(configOptions.name, allLoaders, searchPaths)

  if (!result) {
    return undefined
  }

  // Load and return config values
  const config = await result.loader.load(result.filePath)

  // Config files should return plain objects
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      `Config file '${result.filePath}' must export a plain object, got ${Array.isArray(config) ? 'array' : typeof config}.`,
    )
  }

  return config as Record<string, unknown>
}
