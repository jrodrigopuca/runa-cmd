/**
 * @runa-cmd/help — styled() primitive
 *
 * Apply text styles (bold, dim, italic, underline), foreground color, and padding.
 * Returns a Block (string). Does NOT word-wrap — that's the caller's responsibility.
 */
import { bold, dim, fg, italic, underline } from '../ansi/codes.js';
import { getRenderContext } from '../ansi/detect.js';
import { downsampleColor } from '../ansi/downsample.js';
import type { Block, RenderContext } from '../types.js';

/** Options for styled() */
export interface StyledOptions {
	/** Apply bold */
	bold?: boolean;
	/** Apply dim */
	dim?: boolean;
	/** Apply italic */
	italic?: boolean;
	/** Apply underline */
	underline?: boolean;
	/** Foreground color — hex (#RRGGBB) or named ANSI ('red', 'dim', etc.) */
	color?: string;
	/**
	 * Padding as spaces.
	 * [vertical, horizontal] or [top, right, bottom, left]
	 */
	padding?: [number, number] | [number, number, number, number];
}

/**
 * Apply text styles, color, and padding.
 *
 * @param text - The text to style
 * @param opts - Styling options
 * @param ctx - Optional RenderContext override (uses lazy singleton if omitted)
 */
export function styled(text: string, opts: StyledOptions = {}, ctx?: RenderContext): Block {
	const renderCtx = ctx ?? getRenderContext();
	let result = text;

	// Apply color first (innermost)
	if (opts.color) {
		const ansiColor = downsampleColor(opts.color, renderCtx.colorDepth);
		result = fg(result, ansiColor);
	}

	// Apply styles in consistent order: bold → dim → italic → underline
	if (opts.bold) result = bold(result);
	if (opts.dim) result = dim(result);
	if (opts.italic) result = italic(result);
	if (opts.underline) result = underline(result);

	// Apply padding
	if (opts.padding) {
		const [top, right, bottom, left] = normalizePadding(opts.padding);
		const hPad = ' '.repeat(left);
		const hPadRight = ' '.repeat(right);

		// Split into lines to apply padding per-line
		const lines = result.split('\n');
		const paddedLines = lines.map((line) => `${hPad}${line}${hPadRight}`);

		// Add vertical padding (empty lines of same width)
		const lineWidth = hPad.length + hPadRight.length;
		const emptyLine = ' '.repeat(lineWidth);
		const topLines = Array.from({ length: top }, () => emptyLine);
		const bottomLines = Array.from({ length: bottom }, () => emptyLine);

		result = [...topLines, ...paddedLines, ...bottomLines].join('\n');
	}

	return result;
}

// ─── Internal Helpers ───────────────────────────────────────

function normalizePadding(
	padding: [number, number] | [number, number, number, number],
): [top: number, right: number, bottom: number, left: number] {
	if (padding.length === 4) {
		return padding;
	}
	const [v, h] = padding;
	return [v, h, v, h];
}
