/**
 * @runa-cmd/help — table() primitive
 *
 * Renders a 2D array of strings/Blocks as aligned columns.
 * No grid lines by default — uses padding-based layout.
 */
import { visibleWidth } from '../ansi/codes.js';
import type { Block } from '../types.js';

/** Options for table() */
export interface TableOptions {
	/**
	 * Cell padding [vertical, horizontal] (default: [0, 2]).
	 * Horizontal padding is applied as right-padding between columns.
	 */
	padding?: [number, number];
	/** Optional header row (rendered with bold if styles available) */
	headers?: string[];
}

/**
 * Render rows as a table with auto-sized columns.
 *
 * @param rows - 2D array of cell content
 * @param opts - Table options
 */
export function table(rows: Block[][], opts: TableOptions = {}): Block {
	const [_vPad, hPad] = opts.padding ?? [0, 2];

	if (rows.length === 0 && !opts.headers) return '';

	// Combine headers + rows for column width calculation
	const allRows = opts.headers ? [opts.headers, ...rows] : rows;

	// Find max number of columns
	const numCols = allRows.reduce((max, row) => Math.max(max, row.length), 0);

	// Calculate max visible width per column
	const colWidths: number[] = Array.from({ length: numCols }, () => 0);
	for (const row of allRows) {
		for (let col = 0; col < row.length; col++) {
			colWidths[col] = Math.max(colWidths[col], visibleWidth(row[col]));
		}
	}

	// Render each row
	const separator = ' '.repeat(hPad);
	const resultLines: string[] = [];

	for (const row of allRows) {
		const cells: string[] = [];
		for (let col = 0; col < numCols; col++) {
			const cell = row[col] ?? '';
			if (col < numCols - 1) {
				// Pad to column width (using visible width to account for ANSI)
				const padNeeded = colWidths[col] - visibleWidth(cell);
				cells.push(cell + ' '.repeat(Math.max(0, padNeeded)));
			} else {
				// Last column — no trailing padding
				cells.push(cell);
			}
		}
		resultLines.push(cells.join(separator));
	}

	return resultLines.join('\n');
}
