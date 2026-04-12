/**
 * @runa-cmd/help — list() primitive
 *
 * Renders a bulleted list with configurable bullet and indent.
 * Handles multi-line items with continuation line alignment.
 */
import type { Block } from '../types.js';

/** Options for list() */
export interface ListOptions {
	/** Bullet character (default: '•') */
	bullet?: string;
	/** Left indent in spaces (default: 2) */
	indent?: number;
}

/**
 * Render a bulleted list.
 *
 * @param items - Array of items (may contain newlines for multi-line items)
 * @param opts - List options
 */
export function list(items: string[], opts: ListOptions = {}): Block {
	const bullet = opts.bullet ?? '•';
	const indent = opts.indent ?? 2;

	const indentStr = ' '.repeat(indent);
	// Continuation lines align after "bullet " (bullet + 1 space)
	const continuationIndent = ' '.repeat(indent + bullet.length + 1);

	const resultLines: string[] = [];

	for (const item of items) {
		const lines = item.split('\n');
		// First line: indent + bullet + space + text
		resultLines.push(`${indentStr}${bullet} ${lines[0]}`);
		// Continuation lines: aligned after bullet
		for (let i = 1; i < lines.length; i++) {
			resultLines.push(`${continuationIndent}${lines[i]}`);
		}
	}

	return resultLines.join('\n');
}
