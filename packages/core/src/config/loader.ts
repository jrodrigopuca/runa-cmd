/**
 * @runa-cmd/core — Config file loader
 *
 * ConfigLoader interface + built-in JSON loader.
 * Uses node:fs/promises for zero runtime dependencies.
 */
import { readFile } from 'node:fs/promises';
import type { ConfigLoader } from '../types.js';

// Re-export for convenience
export type { ConfigLoader } from '../types.js';

// ─── Public API ─────────────────────────────────────────────

/** One line: Node quotes the file inside a JSON error, newlines included. */
const reasonOf = (err: unknown): string =>
	(err instanceof Error ? err.message : String(err)).replace(/\s*\n\s*/g, ' ');

/**
 * Built-in JSON config file loader.
 * Reads the file and parses it with JSON.parse(). Its errors name the file
 * first, as every config error does: `my-tool.config.json: invalid JSON: …`.
 */
export function jsonLoader(): ConfigLoader {
	return {
		extensions: ['.json'],
		async load(filePath: string): Promise<unknown> {
			let content: string;
			try {
				content = await readFile(filePath, 'utf-8');
			} catch (err) {
				throw new Error(`${filePath}: can't be read: ${reasonOf(err)}`);
			}

			try {
				// Trailing whitespace means nothing to JSON, and Node would quote it in the error
				return JSON.parse(content.trimEnd()) as unknown;
			} catch (err) {
				throw new Error(`${filePath}: invalid JSON: ${reasonOf(err)}`);
			}
		},
	};
}
