/**
 * Unit tests for styled() primitive (primitives/styled.ts)
 *
 * Tests: padding, bold, dim, italic, underline, color (raw mode + color mode)
 */
import { describe, expect, it } from 'vitest';
import { strip } from '../../ansi/codes.js';
import { styled } from '../../primitives/styled.js';
import type { RenderContext } from '../../types.js';

// ─── Test Context ───────────────────────────────────────────

/** No-color context for raw text assertions */
const RAW: RenderContext = { colorDepth: 'none', termWidth: 80 };

/** Truecolor context for ANSI assertions */
const COLOR: RenderContext = { colorDepth: 'truecolor', termWidth: 80 };

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

// ─── Basic Text (no opts) ───────────────────────────────────

describe('styled — no options', () => {
	it('returns text unchanged with no options', () => {
		expect(styled('hello', {}, RAW)).toBe('hello');
	});

	it('returns text unchanged with empty options', () => {
		expect(styled('hello', undefined as any, RAW)).toBe('hello');
	});
});

// ─── Text Styles ────────────────────────────────────────────

describe('styled — text styles', () => {
	it('applies bold', () => {
		const result = styled('hello', { bold: true }, RAW);
		expect(result).toBe(`${ESC}1mhello${RESET}`);
	});

	it('applies dim', () => {
		const result = styled('hello', { dim: true }, RAW);
		expect(result).toBe(`${ESC}2mhello${RESET}`);
	});

	it('applies italic', () => {
		const result = styled('hello', { italic: true }, RAW);
		expect(result).toBe(`${ESC}3mhello${RESET}`);
	});

	it('applies underline', () => {
		const result = styled('hello', { underline: true }, RAW);
		expect(result).toBe(`${ESC}4mhello${RESET}`);
	});

	it('applies multiple styles (bold + dim)', () => {
		const result = styled('hello', { bold: true, dim: true }, RAW);
		// Style order: bold wraps first, then dim wraps
		expect(result).toContain(`${ESC}1m`);
		expect(result).toContain(`${ESC}2m`);
		expect(strip(result)).toBe('hello');
	});

	it('applies all four styles', () => {
		const result = styled('hello', { bold: true, dim: true, italic: true, underline: true }, RAW);
		expect(result).toContain(`${ESC}1m`);
		expect(result).toContain(`${ESC}2m`);
		expect(result).toContain(`${ESC}3m`);
		expect(result).toContain(`${ESC}4m`);
		expect(strip(result)).toBe('hello');
	});
});

// ─── Color ──────────────────────────────────────────────────

describe('styled — color', () => {
	it('applies hex color in truecolor mode', () => {
		const result = styled('hello', { color: '#FF0000' }, COLOR);
		expect(result).toContain(`${ESC}38;2;255;0;0m`);
		expect(strip(result)).toBe('hello');
	});

	it('applies named color', () => {
		const result = styled('hello', { color: 'yellow' }, COLOR);
		expect(result).toContain(`${ESC}33m`);
		expect(strip(result)).toBe('hello');
	});

	it('does not apply color in none mode', () => {
		const result = styled('hello', { color: '#FF0000' }, RAW);
		// In none mode, downsampleColor returns '' → fg() returns text unchanged
		expect(result).toBe('hello');
	});

	it('combines color + bold', () => {
		const result = styled('hello', { color: '#00FF00', bold: true }, COLOR);
		expect(result).toContain(`${ESC}38;2;0;255;0m`);
		expect(result).toContain(`${ESC}1m`);
		expect(strip(result)).toBe('hello');
	});
});

// ─── Padding ────────────────────────────────────────────────

describe('styled — padding', () => {
	it('applies [vertical, horizontal] padding', () => {
		const result = styled('hi', { padding: [1, 2] }, RAW);
		const lines = result.split('\n');
		// Structure: 1 top pad + 1 content + 1 bottom pad = 3 lines
		expect(lines).toHaveLength(3);
		// Top/bottom lines are empty (spaces only)
		expect(lines[0]!.trim()).toBe('');
		expect(lines[2]!.trim()).toBe('');
		// Content line has 2 spaces left + "hi" + 2 spaces right
		expect(lines[1]).toBe('  hi  ');
	});

	it('applies [top, right, bottom, left] padding', () => {
		const result = styled('x', { padding: [1, 3, 2, 1] }, RAW);
		const lines = result.split('\n');
		// 1 top + 1 content + 2 bottom = 4 lines
		expect(lines).toHaveLength(4);
		// Content line: 1 left + "x" + 3 right
		expect(lines[1]).toBe(' x   ');
	});

	it('handles zero padding', () => {
		const result = styled('hi', { padding: [0, 0] }, RAW);
		expect(result).toBe('hi');
	});

	it('applies padding to multiline text', () => {
		const result = styled('a\nb', { padding: [0, 1] }, RAW);
		const lines = result.split('\n');
		expect(lines).toHaveLength(2);
		expect(lines[0]).toBe(' a ');
		expect(lines[1]).toBe(' b ');
	});
});
