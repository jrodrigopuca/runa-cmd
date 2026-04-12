/**
 * @runa-cmd/core — Config file discovery
 *
 * Searches up search paths for config files matching {name}.config.{ext}.
 * First match wins. Returns null if no config found.
 */
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { ConfigLoader } from '../types.js'

// ─── Public API ─────────────────────────────────────────────

export interface SearchResult {
  filePath: string
  loader: ConfigLoader
}

/**
 * Search for a config file in the given paths.
 *
 * For each search path, for each loader, checks if
 * `{path}/{name}.config{ext}` exists.
 *
 * Search paths are checked in order; first match wins.
 * '~' is resolved to os.homedir().
 *
 * Returns null if no config file is found (not an error).
 */
export async function searchConfig(
  name: string,
  loaders: ConfigLoader[],
  searchPaths: string[],
): Promise<SearchResult | null> {
  for (const rawPath of searchPaths) {
    // Resolve ~ to home directory
    const searchPath = rawPath === '~' ? homedir() : rawPath

    for (const loader of loaders) {
      for (const ext of loader.extensions) {
        const filePath = join(searchPath, `${name}.config${ext}`)
        try {
          await access(filePath)
          return { filePath, loader }
        } catch {
          // File does not exist, continue searching
        }
      }
    }
  }

  return null
}
