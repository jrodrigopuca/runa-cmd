/**
 * @runa-cmd/help — Theme system
 *
 * Provides a default theme, deep-merges partial overrides,
 * and downsamples all colors to the terminal's color depth.
 */
import { downsampleColor } from './ansi/downsample.js';
import type { RenderContext, ResolvedTheme, Theme } from './types.js';

// ─── Default Theme ──────────────────────────────────────────

/** Default theme colors — Lipgloss-inspired */
export const defaultTheme: Theme = {
	primary: '#7D56F4',
	secondary: '#FF6B6B',
	muted: 'dim',
	error: '#FF0000',
	warning: '#FFAA00',
	success: '#00FF00',
};

// ─── Theme Resolution ───────────────────────────────────────

/** Color keys in the Theme interface */
const THEME_KEYS: ReadonlyArray<keyof Theme> = [
	'primary',
	'secondary',
	'muted',
	'error',
	'warning',
	'success',
];

/**
 * Merge a partial theme with defaults and downsample all colors
 * to ANSI-ready escape strings for the current color depth.
 *
 * @param partial - User's partial theme override (or undefined for defaults)
 * @param ctx - RenderContext with colorDepth for downsampling
 */
export function resolveTheme(
	partial: Partial<Theme> | undefined,
	ctx: RenderContext,
): ResolvedTheme {
	// Merge with defaults
	const merged: Theme = { ...defaultTheme, ...partial };

	// Downsample every color to an ANSI escape string
	const resolved = {} as ResolvedTheme;
	for (const key of THEME_KEYS) {
		resolved[key] = downsampleColor(merged[key], ctx.colorDepth);
	}

	return resolved;
}
