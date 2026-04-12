/**
 * @runa-cmd/help — ANSI escape code builders
 *
 * Low-level helpers for applying text styles via ANSI escape sequences.
 * These produce raw escape strings — color downsampling is handled by downsample.ts.
 */

const ESC = '\x1b[';

/** ANSI reset — clears all styles */
export const reset = `${ESC}0m`;

/** Apply bold style */
export function bold(text: string): string {
	return `${ESC}1m${text}${reset}`;
}

/** Apply dim style */
export function dim(text: string): string {
	return `${ESC}2m${text}${reset}`;
}

/** Apply italic style */
export function italic(text: string): string {
	return `${ESC}3m${text}${reset}`;
}

/** Apply underline style */
export function underline(text: string): string {
	return `${ESC}4m${text}${reset}`;
}

/**
 * Apply foreground color.
 * Accepts a pre-computed ANSI escape string (from downsample.ts).
 * If empty string (no color mode), returns text unchanged.
 */
export function fg(text: string, ansiColor: string): string {
	if (!ansiColor) return text;
	return `${ansiColor}${text}${reset}`;
}

// ─── ANSI stripping regex ───────────────────────────────────

// Matches all ANSI escape sequences (CSI sequences + OSC sequences)
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape detection requires control characters
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/**
 * Strip all ANSI escape codes from a string.
 * Useful for raw mode testing and width calculations.
 */
export function strip(text: string): string {
	return text.replace(ANSI_RE, '');
}

/**
 * Get the visible width of a string (excluding ANSI codes).
 * Note: does NOT handle Unicode wide characters (CJK, emoji) — deferred to future package.
 */
export function visibleWidth(text: string): number {
	return strip(text).length;
}
