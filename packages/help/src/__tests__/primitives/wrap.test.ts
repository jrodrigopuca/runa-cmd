/**
 * Unit tests for wrapText() internal utility (primitives/wrap.ts)
 *
 * Tests: word wrap at width, respect newlines, force-break long words, empty input
 */
import { describe, expect, it } from 'vitest';
import { wrapText } from '../../primitives/wrap.js';

// ─── Basic Word Wrap ────────────────────────────────────────

describe('wrapText — basic wrapping', () => {
	it('wraps text at the specified width', () => {
		const result = wrapText('hello world foo bar', 10);
		expect(result).toEqual(['hello', 'world foo', 'bar']);
	});

	it('does not wrap text shorter than width', () => {
		const result = wrapText('hello', 80);
		expect(result).toEqual(['hello']);
	});

	it('wraps each word individually if width is small', () => {
		const result = wrapText('aa bb cc', 3);
		expect(result).toEqual(['aa', 'bb', 'cc']);
	});

	it('fits word + space exactly at width', () => {
		const result = wrapText('abc def', 7);
		expect(result).toEqual(['abc def']);
	});

	it('wraps at word boundary, not mid-word', () => {
		const result = wrapText('the quick brown fox', 10);
		expect(result).toEqual(['the quick', 'brown fox']);
	});
});

// ─── Respect Existing Newlines ──────────────────────────────

describe('wrapText — newlines', () => {
	it('respects existing newlines', () => {
		const result = wrapText('line one\nline two', 80);
		expect(result).toEqual(['line one', 'line two']);
	});

	it('preserves empty lines', () => {
		const result = wrapText('a\n\nb', 80);
		expect(result).toEqual(['a', '', 'b']);
	});

	it('wraps within paragraphs separated by newlines', () => {
		const result = wrapText('aa bb cc\ndd ee', 5);
		expect(result).toEqual(['aa bb', 'cc', 'dd ee']);
	});
});

// ─── Force-Break Long Words ─────────────────────────────────

describe('wrapText — force-break', () => {
	it('force-breaks words longer than width', () => {
		const result = wrapText('abcdefghij', 4);
		expect(result).toEqual(['abcd', 'efgh', 'ij']);
	});

	it('force-breaks and continues with remaining text', () => {
		const result = wrapText('abcdefgh xyz', 5);
		expect(result).toEqual(['abcde', 'fgh', 'xyz']);
	});

	it('force-breaks word after regular words flush', () => {
		const result = wrapText('hi abcdefgh', 5);
		expect(result).toEqual(['hi', 'abcde', 'fgh']);
	});
});

// ─── Edge Cases ─────────────────────────────────────────────

describe('wrapText — edge cases', () => {
	it('handles empty string', () => {
		const result = wrapText('', 80);
		expect(result).toEqual(['']);
	});

	it('handles width <= 0 (returns text as-is)', () => {
		const result = wrapText('hello world', 0);
		expect(result).toEqual(['hello world']);
	});

	it('handles width of 1', () => {
		const result = wrapText('ab', 1);
		expect(result).toEqual(['a', 'b']);
	});

	it('handles single character', () => {
		const result = wrapText('x', 80);
		expect(result).toEqual(['x']);
	});

	it('handles consecutive spaces', () => {
		const result = wrapText('a  b  c', 80);
		// split(/\s+/) collapses multiple spaces
		expect(result).toEqual(['a b c']);
	});
});
