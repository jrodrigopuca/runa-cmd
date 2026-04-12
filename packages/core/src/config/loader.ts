/**
 * @runa-cmd/core — Config file loader
 *
 * ConfigLoader interface + built-in JSON loader.
 * Uses node:fs/promises for zero runtime dependencies.
 */
import { readFile } from 'node:fs/promises'
import type { ConfigLoader } from '../types.js'

// Re-export for convenience
export type { ConfigLoader } from '../types.js'

// ─── Public API ─────────────────────────────────────────────

/**
 * Built-in JSON config file loader.
 * Reads the file and parses it with JSON.parse().
 * Wraps parse errors with a descriptive message including file path.
 */
export function jsonLoader(): ConfigLoader {
  return {
    extensions: ['.json'],
    async load(filePath: string): Promise<unknown> {
      let content: string
      try {
        content = await readFile(filePath, 'utf-8')
      } catch (err) {
        throw new Error(
          `Failed to read config file '${filePath}': ${err instanceof Error ? err.message : String(err)}`,
        )
      }

      try {
        return JSON.parse(content) as unknown
      } catch (err) {
        throw new Error(
          `Invalid JSON in config file '${filePath}': ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    },
  }
}
