/**
 * @runa-cmd/core — Flag names (ADR-0024)
 *
 * Code says `darkColor`, the terminal says `--dark-color`. This is the only
 * place that knows how one becomes the other. MCP tools and config files keep
 * the key: there, the reader is a program, not a person typing.
 */

/** Long option name for a key, without dashes. A key with hyphens is left as written. */
export function flagName(key: string): string {
	if (key.length === 1 || key.includes('-')) return key;

	return key
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

/** The token a person types for a key. */
export const longFlag = (key: string): string => `--${flagName(key)}`;
