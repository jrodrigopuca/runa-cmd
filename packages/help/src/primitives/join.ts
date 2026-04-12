/**
 * @runa-cmd/help — join primitive
 *
 * Compose blocks vertically (stacked) or horizontally (side-by-side).
 * Returns a Block (string).
 */
import { visibleWidth } from '../ansi/codes.js';
import type { Block } from '../types.js';

// ─── Vertical Join ──────────────────────────────────────────

export interface VerticalJoinOptions {
	/** Number of blank lines between blocks (default: 0) */
	gap?: number;
}

/**
 * Stack blocks top-to-bottom.
 *
 * @param blocks - Array of Blocks to stack
 * @param opts - Options (gap between blocks)
 */
function vertical(blocks: Block[], opts: VerticalJoinOptions = {}): Block {
	const gap = opts.gap ?? 0;
	const separator = '\n'.repeat(gap + 1);
	return blocks.filter((b) => b !== '').join(separator);
}

// ─── Horizontal Join ────────────────────────────────────────

export type HorizontalAlign = 'top' | 'center' | 'bottom';

export interface HorizontalJoinOptions {
	/** Space between columns (default: 1) */
	gap?: number;
	/** Vertical alignment of blocks (default: 'top') */
	align?: HorizontalAlign;
}

/**
 * Place blocks side-by-side with alignment.
 *
 * @param blocks - Array of Blocks to place horizontally
 * @param opts - Options (gap, alignment)
 */
function horizontal(blocks: Block[], opts: HorizontalJoinOptions = {}): Block {
	const gap = opts.gap ?? 1;
	const align = opts.align ?? 'top';

	if (blocks.length === 0) return '';
	if (blocks.length === 1) return blocks[0];

	// Split each block into lines
	const blockLines = blocks.map((b) => b.split('\n'));

	// Find max height
	const maxHeight = blockLines.reduce((max, lines) => Math.max(max, lines.length), 0);

	// Find the visible width of each block (max across its lines)
	const blockWidths = blockLines.map((lines) =>
		lines.reduce((max, line) => Math.max(max, visibleWidth(line)), 0),
	);

	// Pad each block to maxHeight according to alignment
	const paddedBlocks = blockLines.map((lines) => padToHeight(lines, maxHeight, align));

	// Zip line-by-line
	const separator = ' '.repeat(gap);
	const resultLines: string[] = [];

	for (let row = 0; row < maxHeight; row++) {
		const parts: string[] = [];
		for (let col = 0; col < paddedBlocks.length; col++) {
			const line = paddedBlocks[col][row] ?? '';
			if (col < paddedBlocks.length - 1) {
				// Pad line to block width so columns align
				const padded = line + ' '.repeat(Math.max(0, blockWidths[col] - visibleWidth(line)));
				parts.push(padded);
			} else {
				// Last column — no trailing padding
				parts.push(line);
			}
		}
		resultLines.push(parts.join(separator));
	}

	return resultLines.join('\n');
}

// ─── Public API ─────────────────────────────────────────────

export const join = {
	vertical,
	horizontal,
} as const;

// ─── Internal Helpers ───────────────────────────────────────

function padToHeight(lines: string[], maxHeight: number, align: HorizontalAlign): string[] {
	const padCount = maxHeight - lines.length;
	if (padCount === 0) return lines;

	const emptyLine = '';
	const padLines = Array.from({ length: padCount }, () => emptyLine);

	switch (align) {
		case 'top':
			return [...lines, ...padLines];
		case 'bottom':
			return [...padLines, ...lines];
		case 'center': {
			const topPad = Math.floor(padCount / 2);
			const bottomPad = padCount - topPad;
			return [
				...Array.from({ length: topPad }, () => emptyLine),
				...lines,
				...Array.from({ length: bottomPad }, () => emptyLine),
			];
		}
	}
}
