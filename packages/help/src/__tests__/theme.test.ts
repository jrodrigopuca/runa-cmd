/**
 * Unit tests for theme system (theme.ts)
 *
 * Tests: defaultTheme values, partial merge, color downsampling propagation
 */
import { describe, expect, it } from 'vitest';
import { defaultTheme, resolveTheme } from '../theme.js';
import type { RenderContext } from '../types.js';

const ESC = '\x1b[';

// ─── Default Theme ──────────────────────────────────────────

describe('defaultTheme', () => {
	it('has all required color keys', () => {
		expect(defaultTheme).toHaveProperty('primary');
		expect(defaultTheme).toHaveProperty('secondary');
		expect(defaultTheme).toHaveProperty('muted');
		expect(defaultTheme).toHaveProperty('error');
		expect(defaultTheme).toHaveProperty('warning');
		expect(defaultTheme).toHaveProperty('success');
	});

	it('muted is a named attribute (dim)', () => {
		expect(defaultTheme.muted).toBe('dim');
	});

	it('primary is a hex color', () => {
		expect(defaultTheme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});
});

// ─── resolveTheme — No Override ─────────────────────────────

describe('resolveTheme — no override', () => {
	it('resolves default theme in truecolor', () => {
		const ctx: RenderContext = { colorDepth: 'truecolor', termWidth: 80 };
		const resolved = resolveTheme(undefined, ctx);

		// primary (#7D56F4) → truecolor escape
		expect(resolved.primary).toContain(`${ESC}38;2;`);
		// muted (dim) → dim escape
		expect(resolved.muted).toBe(`${ESC}2m`);
	});

	it('resolves default theme in none mode (all empty)', () => {
		const ctx: RenderContext = { colorDepth: 'none', termWidth: 80 };
		const resolved = resolveTheme(undefined, ctx);

		expect(resolved.primary).toBe('');
		expect(resolved.secondary).toBe('');
		expect(resolved.muted).toBe('');
		expect(resolved.error).toBe('');
		expect(resolved.warning).toBe('');
		expect(resolved.success).toBe('');
	});
});

// ─── resolveTheme — Partial Override ────────────────────────

describe('resolveTheme — partial override', () => {
	it('merges partial theme with defaults', () => {
		const ctx: RenderContext = { colorDepth: 'truecolor', termWidth: 80 };
		const resolved = resolveTheme({ primary: '#00FF00' }, ctx);

		// Overridden primary → green truecolor
		expect(resolved.primary).toBe(`${ESC}38;2;0;255;0m`);
		// Non-overridden secondary → still from default
		expect(resolved.secondary).toContain(`${ESC}38;2;`);
	});

	it('overrides muted from dim to a hex color', () => {
		const ctx: RenderContext = { colorDepth: 'truecolor', termWidth: 80 };
		const resolved = resolveTheme({ muted: '#888888' }, ctx);

		expect(resolved.muted).toBe(`${ESC}38;2;136;136;136m`);
	});

	it('handles full override', () => {
		const ctx: RenderContext = { colorDepth: 'truecolor', termWidth: 80 };
		const resolved = resolveTheme(
			{
				primary: '#111111',
				secondary: '#222222',
				muted: '#333333',
				error: '#444444',
				warning: '#555555',
				success: '#666666',
			},
			ctx,
		);

		expect(resolved.primary).toBe(`${ESC}38;2;17;17;17m`);
		expect(resolved.secondary).toBe(`${ESC}38;2;34;34;34m`);
		expect(resolved.muted).toBe(`${ESC}38;2;51;51;51m`);
		expect(resolved.error).toBe(`${ESC}38;2;68;68;68m`);
		expect(resolved.warning).toBe(`${ESC}38;2;85;85;85m`);
		expect(resolved.success).toBe(`${ESC}38;2;102;102;102m`);
	});
});

// ─── resolveTheme — Color Depth Downsampling ────────────────

describe('resolveTheme — downsampling', () => {
	it('downsamples to 256 color', () => {
		const ctx: RenderContext = { colorDepth: '256', termWidth: 80 };
		const resolved = resolveTheme(undefined, ctx);

		// Primary should be 256-color escape (38;5;N)
		expect(resolved.primary).toMatch(new RegExp(`^${ESC.replace('[', '\\[')}38;5;\\d+m$`));
	});

	it('downsamples to 16 color', () => {
		const ctx: RenderContext = { colorDepth: '16', termWidth: 80 };
		const resolved = resolveTheme(undefined, ctx);

		// Primary should be standard 16-color escape (30-37 or 90-97)
		expect(resolved.primary).toMatch(new RegExp(`^${ESC.replace('[', '\\[')}\\d+m$`));
	});
});
