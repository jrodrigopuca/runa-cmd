/**
 * @runa-cmd/help — box() primitive
 *
 * Renders a bordered container with configurable border style,
 * border color, padding, and optional width constraint.
 * Content is word-wrapped to fit within the box.
 */
import { reset } from '../ansi/codes.js';
import { getRenderContext } from '../ansi/detect.js';
import { downsampleColor } from '../ansi/downsample.js';
import type { Block, RenderContext } from '../types.js';
import { wrapText } from './wrap.js';

// ─── Border Character Sets ──────────────────────────────────

export type BorderStyle = 'single' | 'double' | 'rounded' | 'none';

interface BorderChars {
	tl: string;
	tr: string;
	bl: string;
	br: string;
	h: string;
	v: string;
}

const BORDERS: Record<BorderStyle, BorderChars> = {
	single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
	double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
	rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
	none: { tl: ' ', tr: ' ', bl: ' ', br: ' ', h: ' ', v: ' ' },
};

/** Options for box() */
export interface BoxOptions {
	/** Content string to place inside the box */
	content: string;
	/** Border style (default: 'single') */
	border?: BorderStyle;
	/** Border color — hex or named (default: none) */
	borderColor?: string;
	/** Inner padding [vertical, horizontal] or [top, right, bottom, left] (default: [0, 1]) */
	padding?: [number, number] | [number, number, number, number];
	/** Fixed width (auto-fit to content if omitted) */
	width?: number;
}

/**
 * Render a bordered box with optional padding and color.
 *
 * @param opts - Box options
 * @param ctx - Optional RenderContext override
 */
export function box(opts: BoxOptions, ctx?: RenderContext): Block {
	const renderCtx = ctx ?? getRenderContext();
	const border = opts.border ?? 'single';
	const chars = BORDERS[border];
	const [padTop, padRight, padBottom, padLeft] = normalizePadding(opts.padding ?? [0, 1]);

	// Determine inner width
	const borderWidth = 2; // left + right border chars
	const hPadding = padLeft + padRight;

	let innerWidth: number;
	if (opts.width) {
		innerWidth = opts.width - borderWidth - hPadding;
		if (innerWidth < 1) innerWidth = 1;
	} else {
		// Auto-fit: find longest content line
		const rawLines = opts.content.split('\n');
		const maxContentWidth = rawLines.reduce((max, line) => Math.max(max, line.length), 0);
		innerWidth = maxContentWidth;
	}

	// Word-wrap content to inner width
	const wrappedLines = wrapText(opts.content, innerWidth);

	// Pad each content line to full inner width
	const contentLines = wrappedLines.map(
		(line) => `${' '.repeat(padLeft)}${line.padEnd(innerWidth)}${' '.repeat(padRight)}`,
	);

	// Add vertical padding lines
	const totalInner = innerWidth + hPadding;
	const emptyLine = ' '.repeat(totalInner);
	const topPadLines = Array.from({ length: padTop }, () => emptyLine);
	const bottomPadLines = Array.from({ length: padBottom }, () => emptyLine);
	const allContentLines = [...topPadLines, ...contentLines, ...bottomPadLines];

	// Resolve border color
	let colorAnsi = '';
	let colorReset = '';
	if (opts.borderColor) {
		colorAnsi = downsampleColor(opts.borderColor, renderCtx.colorDepth);
		if (colorAnsi) colorReset = reset;
	}

	// Assemble the box
	const bc = (ch: string) => (colorAnsi ? `${colorAnsi}${ch}${colorReset}` : ch);
	const topBorder = `${bc(chars.tl)}${bc(chars.h.repeat(totalInner))}${bc(chars.tr)}`;
	const bottomBorder = `${bc(chars.bl)}${bc(chars.h.repeat(totalInner))}${bc(chars.br)}`;
	const bodyLines = allContentLines.map((line) => `${bc(chars.v)}${line}${bc(chars.v)}`);

	return [topBorder, ...bodyLines, bottomBorder].join('\n');
}

// ─── Internal Helpers ───────────────────────────────────────

function normalizePadding(
	padding: [number, number] | [number, number, number, number],
): [top: number, right: number, bottom: number, left: number] {
	if (padding.length === 4) return padding;
	const [v, h] = padding;
	return [v, h, v, h];
}
