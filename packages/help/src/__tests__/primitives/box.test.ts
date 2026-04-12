/**
 * Unit tests for box() primitive (primitives/box.ts)
 *
 * Tests: all border styles, padding, width constraint, content wrap
 */
import { describe, expect, it } from 'vitest';
import { strip } from '../../ansi/codes.js';
import { box } from '../../primitives/box.js';
import type { RenderContext } from '../../types.js';

/** No-color context for raw text assertions */
const RAW: RenderContext = { colorDepth: 'none', termWidth: 80 };

/** Truecolor context for color tests */
const COLOR: RenderContext = { colorDepth: 'truecolor', termWidth: 80 };

// ─── Border Styles ──────────────────────────────────────────

describe('box — border styles', () => {
	it('renders single border (default)', () => {
		const result = box({ content: 'hi' }, RAW);
		const lines = result.split('\n');
		expect(lines[0]).toContain('┌');
		expect(lines[0]).toContain('┐');
		expect(lines[1]).toContain('│');
		expect(lines[2]).toContain('└');
		expect(lines[2]).toContain('┘');
	});

	it('renders double border', () => {
		const result = box({ content: 'hi', border: 'double' }, RAW);
		const lines = result.split('\n');
		expect(lines[0]).toContain('╔');
		expect(lines[0]).toContain('╗');
		expect(lines[1]).toContain('║');
		expect(lines[2]).toContain('╚');
		expect(lines[2]).toContain('╝');
	});

	it('renders rounded border', () => {
		const result = box({ content: 'hi', border: 'rounded' }, RAW);
		const lines = result.split('\n');
		expect(lines[0]).toContain('╭');
		expect(lines[0]).toContain('╮');
		expect(lines[2]).toContain('╰');
		expect(lines[2]).toContain('╯');
	});

	it('renders none border (spaces)', () => {
		const result = box({ content: 'hi', border: 'none' }, RAW);
		const lines = result.split('\n');
		// No box-drawing characters
		expect(lines[0]).not.toMatch(/[┌┐└┘╔╗╚╝╭╮╰╯│║─═]/);
	});
});

// ─── Padding ────────────────────────────────────────────────

describe('box — padding', () => {
	it('applies default [0, 1] padding', () => {
		const result = box({ content: 'x' }, RAW);
		const lines = result.split('\n');
		// Content line: │ x │ (1 space each side)
		expect(lines[1]).toBe('│ x │');
	});

	it('applies custom [vertical, horizontal] padding', () => {
		const result = box({ content: 'x', padding: [1, 2] }, RAW);
		const lines = result.split('\n');
		// 3 content lines: 1 top pad + 1 content + 1 bottom pad = 5 total (with top/bottom border)
		expect(lines).toHaveLength(5);
		// Content line: │  x  │ (2 spaces each side)
		expect(lines[2]).toBe('│  x  │');
	});

	it('applies custom [top, right, bottom, left] padding', () => {
		const result = box({ content: 'x', padding: [0, 3, 0, 1] }, RAW);
		const lines = result.split('\n');
		// 3 lines: top border + content + bottom border
		expect(lines).toHaveLength(3);
		// Content: │ x   │
		expect(lines[1]).toBe('│ x   │');
	});
});

// ─── Width Constraint ───────────────────────────────────────

describe('box — width', () => {
	it('auto-fits width to content', () => {
		const result = box({ content: 'hello', padding: [0, 1] }, RAW);
		const lines = result.split('\n');
		// Width: 2 border + 2 padding + 5 content = 9
		expect(lines[0]!.length).toBe(9);
	});

	it('constrains to fixed width', () => {
		const result = box({ content: 'hello world', width: 12, padding: [0, 1] }, RAW);
		const lines = result.split('\n');
		// Fixed width = 12, all lines should be 12 chars
		expect(lines[0]!.length).toBe(12);
	});

	it('word-wraps content to fit inner width', () => {
		const result = box({ content: 'hello world', width: 12, padding: [0, 1] }, RAW);
		const lines = result.split('\n');
		// Inner width = 12 - 2 border - 2 padding = 8
		// "hello world" wraps to "hello" + "world"
		expect(lines).toHaveLength(4); // top border + 2 content + bottom border
	});
});

// ─── Border Color ───────────────────────────────────────────

describe('box — borderColor', () => {
	it('applies border color in color mode', () => {
		const result = box({ content: 'hi', borderColor: '#FF0000' }, COLOR);
		// Border chars should have ANSI color codes
		expect(result).toContain('\x1b[38;2;255;0;0m');
		// Content should still be plain
		expect(strip(result)).toContain('hi');
	});

	it('no color applied in none mode', () => {
		const result = box({ content: 'hi', borderColor: '#FF0000' }, RAW);
		// No ANSI codes at all in border (downsampleColor returns '' for none)
		expect(result).not.toContain('\x1b[38');
	});
});

// ─── Content Wrapping ───────────────────────────────────────

describe('box — content wrapping', () => {
	it('wraps long content within auto-fit box', () => {
		const result = box({ content: 'a b c d e f', width: 10, padding: [0, 1] }, RAW);
		const lines = result.split('\n');
		// Inner = 10 - 2 - 2 = 6, "a b c d e f" wraps
		expect(lines.length).toBeGreaterThan(3);
	});

	it('handles multiline content input', () => {
		const result = box({ content: 'line1\nline2', padding: [0, 1] }, RAW);
		const lines = result.split('\n');
		// top border + 2 content lines + bottom border = 4
		expect(lines).toHaveLength(4);
		expect(lines[1]).toContain('line1');
		expect(lines[2]).toContain('line2');
	});
});
