/**
 * @runa-cmd/help — wrapText() internal utility
 *
 * Word-wraps text to a given width. Used internally by box and columns.
 * NOT exported at package root.
 */
import { visibleWidth } from '../ansi/codes.js';

/**
 * Word-wrap text to fit within a given width.
 *
 * - Splits on spaces, re-joins lines under width limit
 * - Respects existing newlines (each \n starts a new line)
 * - Force-breaks words longer than width
 * - Returns an array of lines (no trailing newline)
 */
export function wrapText(text: string, width: number): string[] {
	if (width <= 0) return [text];

	const result: string[] = [];
	const paragraphs = text.split('\n');

	for (const paragraph of paragraphs) {
		if (paragraph === '') {
			result.push('');
			continue;
		}

		const words = paragraph.split(/\s+/);
		let currentLine = '';

		for (const word of words) {
			const wordWidth = visibleWidth(word);

			// Force-break words longer than width
			if (wordWidth > width) {
				// Flush current line if not empty
				if (currentLine) {
					result.push(currentLine);
					currentLine = '';
				}
				// Break the long word into chunks
				let remaining = word;
				while (remaining.length > width) {
					result.push(remaining.slice(0, width));
					remaining = remaining.slice(width);
				}
				if (remaining) {
					currentLine = remaining;
				}
				continue;
			}

			if (!currentLine) {
				// First word on line
				currentLine = word;
			} else if (visibleWidth(currentLine) + 1 + wordWidth <= width) {
				// Fits with a space
				currentLine += ` ${word}`;
			} else {
				// Doesn't fit — flush and start new line
				result.push(currentLine);
				currentLine = word;
			}
		}

		// Flush last line of paragraph
		if (currentLine) {
			result.push(currentLine);
		}
	}

	return result;
}
