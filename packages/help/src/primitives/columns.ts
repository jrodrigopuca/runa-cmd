/**
 * @runa-cmd/help — columns() primitive
 *
 * Distributes blocks evenly across terminal width with auto-calculated
 * column widths and word-wrapping per column.
 */
import { getRenderContext } from '../ansi/detect.js';
import type { Block, RenderContext } from '../types.js';
import { join } from './join.js';
import { wrapText } from './wrap.js';

/** Options for columns() */
export interface ColumnsOptions {
	/** Gap between columns in spaces (default: 2) */
	gap?: number;
}

/**
 * Render blocks as evenly-spaced columns across terminal width.
 *
 * @param blocks - Array of content blocks
 * @param opts - Column options
 * @param ctx - Optional RenderContext override
 */
export function columns(blocks: Block[], opts: ColumnsOptions = {}, ctx?: RenderContext): Block {
	const renderCtx = ctx ?? getRenderContext();
	const gap = opts.gap ?? 2;
	const numCols = blocks.length;

	if (numCols === 0) return '';
	if (numCols === 1) return blocks[0];

	// Calculate column width: (termWidth - gaps) / numCols
	const totalGaps = gap * (numCols - 1);
	const colWidth = Math.floor((renderCtx.termWidth - totalGaps) / numCols);

	if (colWidth < 1) {
		// Terminal too narrow for multi-column — stack vertically
		return join.vertical(blocks, { gap: 1 });
	}

	// Word-wrap each block to column width
	const wrappedBlocks = blocks.map((block) => wrapText(block, colWidth).join('\n'));

	// Use horizontal join to place side-by-side
	return join.horizontal(wrappedBlocks, { gap, align: 'top' });
}
