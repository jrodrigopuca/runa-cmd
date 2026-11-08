import type { OptionSchema } from '@runa-cmd/core';

/**
 * Whether TAB offers `--no-<flag>`. Only a boolean that starts on has anything
 * to turn off: `--no-cache` does, and `--no-force`, `--no-help` or `--no-mcp`
 * would be choices that change nothing (T-227).
 */
export const offersNegation = (opt: OptionSchema): boolean =>
	opt.type === 'boolean' && opt.defaultValue === true;
