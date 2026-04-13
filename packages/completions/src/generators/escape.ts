/**
 * @runa-cmd/completions — Shell escape helpers
 *
 * Per-shell escape functions for safely embedding strings in generated
 * completion scripts. Each function handles the quoting rules of its
 * target shell. Descriptions are truncated to 80 chars.
 */

const MAX_DESC_LENGTH = 80;

/** Truncate and collapse newlines for safe embedding */
function sanitize(str: string): string {
	const collapsed = str.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
	if (collapsed.length <= MAX_DESC_LENGTH) return collapsed;
	return `${collapsed.slice(0, MAX_DESC_LENGTH - 1)}\u2026`;
}

/**
 * Escape a string for embedding in a single-quoted bash context.
 *
 * In bash single quotes, the ONLY special character is `'` itself.
 * We end the current quote, insert an escaped quote, and restart: `'\''`
 */
export function escapeBash(str: string): string {
	return sanitize(str).replace(/'/g, "'\\''");
}

/**
 * Escape a string for embedding in a single-quoted zsh context.
 *
 * Zsh single-quote escaping is identical to bash: `'\''`
 */
export function escapeZsh(str: string): string {
	return sanitize(str).replace(/'/g, "'\\''");
}

/**
 * Escape a string for embedding in a single-quoted fish context.
 *
 * Fish uses backslash escaping inside single quotes:
 * - `\` → `\\`
 * - `'` → `\'`
 */
export function escapeFish(str: string): string {
	return sanitize(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
