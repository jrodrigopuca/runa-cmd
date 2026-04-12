/**
 * Unit tests for columns() primitive (primitives/columns.ts)
 *
 * Tests: column width math, word-wrap per column, gap, terminal width, fallback to vertical
 */
import { describe, expect, it } from 'vitest';
import { columns } from '../../primitives/columns.js';
import type { RenderContext } from '../../types.js';

// ─── Basic Column Layout ────────────────────────────────────

describe('columns — basic rendering', () => {
	it('distributes two blocks evenly', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 40 };
		const result = columns(['left content', 'right content'], { gap: 2 }, ctx);
		// colWidth = (40 - 2) / 2 = 19
		// Both blocks fit in 19 chars, placed side-by-side
		expect(result).toContain('left content');
		expect(result).toContain('right content');
	});

	it('returns empty string for empty blocks', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 80 };
		expect(columns([], {}, ctx)).toBe('');
	});

	it('returns single block as-is', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 80 };
		expect(columns(['only block'], {}, ctx)).toBe('only block');
	});
});

// ─── Column Width Calculation ───────────────────────────────

describe('columns — width calculation', () => {
	it('calculates correct column width for 2 columns', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 80 };
		// colWidth = (80 - 2) / 2 = 39 with default gap=2
		const result = columns(['a', 'b'], {}, ctx);
		// Both should be on same line
		const lines = result.split('\n');
		expect(lines).toHaveLength(1);
	});

	it('uses custom gap', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 80 };
		const result = columns(['left', 'right'], { gap: 4 }, ctx);
		// colWidth = (80 - 4) / 2 = 38
		const lines = result.split('\n');
		expect(lines).toHaveLength(1);
		// Gap should be 4 spaces between columns
		expect(lines[0]).toMatch(/left\s{4,}right/);
	});
});

// ─── Word Wrap per Column ───────────────────────────────────

describe('columns — word wrapping', () => {
	it('wraps long content within column width', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 20 };
		// colWidth = (20 - 2) / 2 = 9
		const result = columns(['short text that wraps', 'another long text here'], { gap: 2 }, ctx);
		const lines = result.split('\n');
		// Content should wrap to multiple lines
		expect(lines.length).toBeGreaterThan(1);
	});
});

// ─── Narrow Terminal Fallback ───────────────────────────────

describe('columns — narrow terminal fallback', () => {
	it('falls back to vertical layout when too narrow', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 4 };
		// colWidth = (4 - 2) / 3 = 0 → fallback
		const result = columns(['block1', 'block2', 'block3'], { gap: 2 }, ctx);
		// Should be stacked vertically
		expect(result).toContain('block1');
		expect(result).toContain('block2');
		expect(result).toContain('block3');
	});
});

// ─── Three Columns ──────────────────────────────────────────

describe('columns — three columns', () => {
	it('distributes three blocks evenly', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 60 };
		// colWidth = (60 - 4) / 3 = 18 (gap=2, 2 gaps)
		const result = columns(['col1', 'col2', 'col3'], { gap: 2 }, ctx);
		const lines = result.split('\n');
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain('col1');
		expect(lines[0]).toContain('col2');
		expect(lines[0]).toContain('col3');
	});
});
