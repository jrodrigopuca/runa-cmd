/**
 * Unit tests for terminal detection (ansi/detect.ts)
 *
 * Tests: detectColorDepth (all branches), detectTermWidth, getRenderContext singleton, resetRenderContext
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	detectColorDepth,
	detectTermWidth,
	getRenderContext,
	resetRenderContext,
} from '../../ansi/detect.js';

// ─── Helpers ────────────────────────────────────────────────

/** Save and restore env + stdout properties around each test */
let savedEnv: NodeJS.ProcessEnv;
let savedIsTTY: boolean | undefined;
let savedColumns: number | undefined;
let savedHasColors: typeof process.stdout.hasColors | undefined;

beforeEach(() => {
	savedEnv = { ...process.env };
	savedIsTTY = process.stdout.isTTY;
	savedColumns = process.stdout.columns;
	savedHasColors = process.stdout.hasColors;
	resetRenderContext();

	// Clean env vars that affect detection
	delete process.env.NO_COLOR;
	delete process.env.FORCE_COLOR;
	delete process.env.COLORTERM;
	delete process.env.TERM;
});

afterEach(() => {
	process.env = savedEnv;
	Object.defineProperty(process.stdout, 'isTTY', { value: savedIsTTY, configurable: true });
	process.stdout.columns = savedColumns!;
	(process.stdout as any).hasColors = savedHasColors;
});

function setTTY(isTTY: boolean) {
	Object.defineProperty(process.stdout, 'isTTY', { value: isTTY, configurable: true });
}

// ─── detectColorDepth ───────────────────────────────────────

describe('detectColorDepth', () => {
	it('returns none when NO_COLOR is set (empty string)', () => {
		process.env.NO_COLOR = '';
		expect(detectColorDepth()).toBe('none');
	});

	it('returns none when NO_COLOR is set (any value)', () => {
		process.env.NO_COLOR = '1';
		expect(detectColorDepth()).toBe('none');
	});

	it('NO_COLOR takes priority over FORCE_COLOR', () => {
		process.env.NO_COLOR = '';
		process.env.FORCE_COLOR = '3';
		expect(detectColorDepth()).toBe('none');
	});

	it('FORCE_COLOR=3 → truecolor', () => {
		process.env.FORCE_COLOR = '3';
		expect(detectColorDepth()).toBe('truecolor');
	});

	it('FORCE_COLOR=2 → 256', () => {
		process.env.FORCE_COLOR = '2';
		expect(detectColorDepth()).toBe('256');
	});

	it('FORCE_COLOR=1 → 16', () => {
		process.env.FORCE_COLOR = '1';
		expect(detectColorDepth()).toBe('16');
	});

	it('FORCE_COLOR="" → 16 (any unrecognized value defaults to 16)', () => {
		process.env.FORCE_COLOR = '';
		expect(detectColorDepth()).toBe('16');
	});

	it('non-TTY without FORCE_COLOR → none', () => {
		setTTY(false);
		expect(detectColorDepth()).toBe('none');
	});

	it('COLORTERM=truecolor → truecolor (when TTY)', () => {
		setTTY(true);
		process.env.COLORTERM = 'truecolor';
		expect(detectColorDepth()).toBe('truecolor');
	});

	it('COLORTERM=24bit → truecolor (when TTY)', () => {
		setTTY(true);
		process.env.COLORTERM = '24bit';
		expect(detectColorDepth()).toBe('truecolor');
	});

	it('TERM=xterm-256color → 256 (when TTY)', () => {
		setTTY(true);
		process.env.TERM = 'xterm-256color';
		expect(detectColorDepth()).toBe('256');
	});

	it('TERM containing 256color → 256 (when TTY)', () => {
		setTTY(true);
		process.env.TERM = 'screen-256color';
		expect(detectColorDepth()).toBe('256');
	});

	it('falls back to hasColors(16777216) for truecolor (when TTY)', () => {
		setTTY(true);
		(process.stdout as any).hasColors = (n: number) => n <= 16_777_216;
		expect(detectColorDepth()).toBe('truecolor');
	});

	it('falls back to hasColors(256) (when TTY)', () => {
		setTTY(true);
		(process.stdout as any).hasColors = (n: number) => n <= 256;
		expect(detectColorDepth()).toBe('256');
	});

	it('falls back to hasColors(16) (when TTY)', () => {
		setTTY(true);
		(process.stdout as any).hasColors = (n: number) => n <= 16;
		expect(detectColorDepth()).toBe('16');
	});

	it('returns none when TTY but no signals at all', () => {
		setTTY(true);
		(process.stdout as any).hasColors = undefined;
		expect(detectColorDepth()).toBe('none');
	});
});

// ─── detectTermWidth ────────────────────────────────────────

describe('detectTermWidth', () => {
	it('returns stdout.columns when available', () => {
		process.stdout.columns = 120;
		expect(detectTermWidth()).toBe(120);
	});

	it('falls back to 80 when columns is undefined', () => {
		Object.defineProperty(process.stdout, 'columns', {
			value: undefined,
			configurable: true,
			writable: true,
		});
		expect(detectTermWidth()).toBe(80);
	});
});

// ─── getRenderContext / resetRenderContext ───────────────────

describe('getRenderContext', () => {
	it('returns a RenderContext with colorDepth and termWidth', () => {
		setTTY(true);
		process.env.FORCE_COLOR = '3';
		process.stdout.columns = 100;

		const ctx = getRenderContext();
		expect(ctx).toEqual({
			colorDepth: 'truecolor',
			termWidth: 100,
		});
	});

	it('caches the result (lazy singleton)', () => {
		process.env.FORCE_COLOR = '1';
		process.stdout.columns = 50;

		const first = getRenderContext();
		expect(first.colorDepth).toBe('16');

		// Change env — should NOT affect cached result
		process.env.FORCE_COLOR = '3';
		process.stdout.columns = 200;

		const second = getRenderContext();
		expect(second).toBe(first); // Same reference
		expect(second.colorDepth).toBe('16');
		expect(second.termWidth).toBe(50);
	});

	it('resetRenderContext clears the cache', () => {
		process.env.FORCE_COLOR = '1';
		process.stdout.columns = 50;

		const first = getRenderContext();
		expect(first.colorDepth).toBe('16');

		resetRenderContext();
		process.env.FORCE_COLOR = '3';
		process.stdout.columns = 200;

		const second = getRenderContext();
		expect(second).not.toBe(first);
		expect(second.colorDepth).toBe('truecolor');
		expect(second.termWidth).toBe(200);
	});
});
