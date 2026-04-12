/**
 * Unit tests for join primitive (primitives/join.ts)
 *
 * Tests: vertical gap, horizontal align (top/center/bottom), mixed heights, empty blocks
 */
import { describe, expect, it } from 'vitest';
import { join } from '../../primitives/join.js';

// ─── Vertical Join ──────────────────────────────────────────

describe('join.vertical', () => {
	it('stacks blocks with no gap', () => {
		const result = join.vertical(['aaa', 'bbb']);
		expect(result).toBe('aaa\nbbb');
	});

	it('stacks blocks with gap=1', () => {
		const result = join.vertical(['aaa', 'bbb'], { gap: 1 });
		expect(result).toBe('aaa\n\nbbb');
	});

	it('stacks blocks with gap=2', () => {
		const result = join.vertical(['aaa', 'bbb'], { gap: 2 });
		expect(result).toBe('aaa\n\n\nbbb');
	});

	it('filters out empty blocks', () => {
		const result = join.vertical(['aaa', '', 'bbb']);
		expect(result).toBe('aaa\nbbb');
	});

	it('handles single block', () => {
		const result = join.vertical(['only']);
		expect(result).toBe('only');
	});

	it('handles empty array', () => {
		const result = join.vertical([]);
		expect(result).toBe('');
	});

	it('handles multiline blocks', () => {
		const result = join.vertical(['a\nb', 'c\nd'], { gap: 0 });
		expect(result).toBe('a\nb\nc\nd');
	});
});

// ─── Horizontal Join ────────────────────────────────────────

describe('join.horizontal', () => {
	it('places blocks side-by-side with default gap=1', () => {
		const result = join.horizontal(['aa', 'bb']);
		expect(result).toBe('aa bb');
	});

	it('places blocks side-by-side with custom gap', () => {
		const result = join.horizontal(['aa', 'bb'], { gap: 3 });
		expect(result).toBe('aa   bb');
	});

	it('returns empty string for empty array', () => {
		expect(join.horizontal([])).toBe('');
	});

	it('returns single block as-is', () => {
		expect(join.horizontal(['only'])).toBe('only');
	});
});

// ─── Horizontal Alignment ───────────────────────────────────

describe('join.horizontal — alignment', () => {
	it('aligns top (default) with mixed heights', () => {
		const result = join.horizontal(['a\nb\nc', 'x'], { gap: 1 });
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		expect(lines[0]).toBe('a x');
		// Trailing separator + empty string from padded second block
		expect(lines[1]).toBe('b ');
		expect(lines[2]).toBe('c ');
	});

	it('aligns bottom with mixed heights', () => {
		const result = join.horizontal(['a\nb\nc', 'x'], { gap: 1, align: 'bottom' });
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		expect(lines[0]).toBe('a ');
		expect(lines[1]).toBe('b ');
		expect(lines[2]).toBe('c x');
	});

	it('aligns center with mixed heights', () => {
		const result = join.horizontal(['a\nb\nc', 'x'], { gap: 1, align: 'center' });
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		// x should be in the middle row (index 1)
		expect(lines[1]).toBe('b x');
	});
});

// ─── Mixed Height + Width ───────────────────────────────────

describe('join.horizontal — width normalization', () => {
	it('pads shorter blocks to match widths for alignment', () => {
		// Block 1 is wider: "long" (4 chars) vs Block 2: "x" (1 char) vs Block 3: "z"
		const result = join.horizontal(['long\nword', 'ab\ncd\nef'], { gap: 2 });
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		// First column padded to width 4, gap 2, then second column
		expect(lines[0]).toBe('long  ab');
		expect(lines[1]).toBe('word  cd');
		expect(lines[2]).toBe('      ef');
	});

	it('handles three blocks of different heights', () => {
		const result = join.horizontal(['a', 'b\nc', 'd\ne\nf'], { gap: 1 });
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
	});
});
