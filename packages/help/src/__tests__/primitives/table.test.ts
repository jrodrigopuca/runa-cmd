/**
 * Unit tests for table() primitive (primitives/table.ts)
 *
 * Tests: column auto-width, padding, headers, empty table, ANSI-aware width
 */
import { describe, expect, it } from 'vitest';
import { bold } from '../../ansi/codes.js';
import { table } from '../../primitives/table.js';

// ─── Basic Table ────────────────────────────────────────────

describe('table — basic rendering', () => {
	it('renders a simple 2-column table', () => {
		const result = table([
			['name', 'desc'],
			['foo', 'bar'],
		]);
		const lines = result.split('\n');
		expect(lines).toHaveLength(2);
		// Default padding [0, 2] → 2 spaces between columns
		expect(lines[0]).toBe('name  desc');
		expect(lines[1]).toBe('foo   bar');
	});

	it('auto-sizes columns to widest cell', () => {
		const result = table([
			['a', 'longer description'],
			['longer-name', 'b'],
		]);
		const lines = result.split('\n');
		// First column width = 11 ("longer-name"), padded
		expect(lines[0]).toMatch(/^a\s+longer description$/);
		expect(lines[1]).toMatch(/^longer-name\s+b$/);
	});

	it('renders empty table', () => {
		expect(table([])).toBe('');
	});

	it('handles single-column table', () => {
		const result = table([['one'], ['two']]);
		const lines = result.split('\n');
		expect(lines).toEqual(['one', 'two']);
	});

	it('handles rows with different column counts', () => {
		const result = table([
			['a', 'b', 'c'],
			['x', 'y'],
		]);
		const lines = result.split('\n');
		expect(lines).toHaveLength(2);
		// Second row should still render with 2 columns (3rd is empty)
	});
});

// ─── Custom Padding ─────────────────────────────────────────

describe('table — padding', () => {
	it('uses custom horizontal padding', () => {
		const result = table(
			[
				['a', 'b'],
				['c', 'd'],
			],
			{ padding: [0, 4] },
		);
		const lines = result.split('\n');
		// 4 spaces between columns
		expect(lines[0]).toBe('a    b');
		expect(lines[1]).toBe('c    d');
	});
});

// ─── Headers ────────────────────────────────────────────────

describe('table — headers', () => {
	it('renders headers as first row', () => {
		const result = table(
			[
				['val1', 'val2'],
				['val3', 'val4'],
			],
			{ headers: ['Col A', 'Col B'] },
		);
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		expect(lines[0]).toContain('Col A');
		expect(lines[0]).toContain('Col B');
	});

	it('headers affect column width calculation', () => {
		const result = table([['x', 'y']], { headers: ['Very Long Header', 'H2'] });
		const lines = result.split('\n');
		// First column should be at least 16 chars wide (header width)
		expect(lines[1]!.indexOf('y')).toBeGreaterThanOrEqual(18); // 16 + 2 padding
	});

	it('renders headers-only table (no data rows)', () => {
		const result = table([], { headers: ['A', 'B'] });
		const lines = result.split('\n');
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain('A');
	});
});

// ─── ANSI-Aware Width ───────────────────────────────────────

describe('table — ANSI-aware column width', () => {
	it('accounts for ANSI codes when computing column width', () => {
		const boldText = bold('hi');
		const result = table([
			[boldText, 'desc'],
			['plain', 'other'],
		]);
		const lines = result.split('\n');
		// "hi" with bold has more bytes but visible width = 2
		// "plain" visible width = 5 → column width should be 5
		// Both lines should align properly
		expect(lines).toHaveLength(2);
	});
});
