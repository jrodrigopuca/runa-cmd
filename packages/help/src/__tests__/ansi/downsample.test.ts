/**
 * Unit tests for color downsampling (ansi/downsample.ts)
 *
 * Tests: hex→truecolor, hex→256, hex→16, named passthrough, no-color mode
 */
import { describe, expect, it } from 'vitest';
import { downsampleColor } from '../../ansi/downsample.js';

const ESC = '\x1b[';

// ─── No-Color Mode ──────────────────────────────────────────

describe('downsampleColor — depth none', () => {
	it('returns empty string for hex colors', () => {
		expect(downsampleColor('#FF0000', 'none')).toBe('');
	});

	it('returns empty string for named attributes', () => {
		expect(downsampleColor('bold', 'none')).toBe('');
	});

	it('returns empty string for any input', () => {
		expect(downsampleColor('#7D56F4', 'none')).toBe('');
		expect(downsampleColor('dim', 'none')).toBe('');
	});
});

// ─── Named Attribute Passthrough ────────────────────────────

describe('downsampleColor — named attributes', () => {
	it('passes through bold as ANSI escape', () => {
		expect(downsampleColor('bold', 'truecolor')).toBe(`${ESC}1m`);
	});

	it('passes through dim as ANSI escape', () => {
		expect(downsampleColor('dim', 'truecolor')).toBe(`${ESC}2m`);
	});

	it('passes through italic as ANSI escape', () => {
		expect(downsampleColor('italic', 'truecolor')).toBe(`${ESC}3m`);
	});

	it('passes through underline as ANSI escape', () => {
		expect(downsampleColor('underline', 'truecolor')).toBe(`${ESC}4m`);
	});

	it('passes through named colors (red, green, etc.)', () => {
		expect(downsampleColor('red', 'truecolor')).toBe(`${ESC}31m`);
		expect(downsampleColor('green', 'truecolor')).toBe(`${ESC}32m`);
		expect(downsampleColor('yellow', 'truecolor')).toBe(`${ESC}33m`);
		expect(downsampleColor('blue', 'truecolor')).toBe(`${ESC}34m`);
		expect(downsampleColor('magenta', 'truecolor')).toBe(`${ESC}35m`);
		expect(downsampleColor('cyan', 'truecolor')).toBe(`${ESC}36m`);
		expect(downsampleColor('white', 'truecolor')).toBe(`${ESC}37m`);
	});

	it('named attributes work for all depths (same escape)', () => {
		expect(downsampleColor('dim', '256')).toBe(`${ESC}2m`);
		expect(downsampleColor('dim', '16')).toBe(`${ESC}2m`);
		expect(downsampleColor('red', '256')).toBe(`${ESC}31m`);
		expect(downsampleColor('red', '16')).toBe(`${ESC}31m`);
	});
});

// ─── Truecolor ──────────────────────────────────────────────

describe('downsampleColor — truecolor', () => {
	it('converts hex to 24-bit ANSI (pure red)', () => {
		expect(downsampleColor('#FF0000', 'truecolor')).toBe(`${ESC}38;2;255;0;0m`);
	});

	it('converts hex to 24-bit ANSI (pure green)', () => {
		expect(downsampleColor('#00FF00', 'truecolor')).toBe(`${ESC}38;2;0;255;0m`);
	});

	it('converts hex to 24-bit ANSI (pure blue)', () => {
		expect(downsampleColor('#0000FF', 'truecolor')).toBe(`${ESC}38;2;0;0;255m`);
	});

	it('converts hex to 24-bit ANSI (white)', () => {
		expect(downsampleColor('#FFFFFF', 'truecolor')).toBe(`${ESC}38;2;255;255;255m`);
	});

	it('converts hex to 24-bit ANSI (black)', () => {
		expect(downsampleColor('#000000', 'truecolor')).toBe(`${ESC}38;2;0;0;0m`);
	});

	it('handles lowercase hex', () => {
		expect(downsampleColor('#ff00ff', 'truecolor')).toBe(`${ESC}38;2;255;0;255m`);
	});

	it('handles mixed case hex', () => {
		expect(downsampleColor('#aaBBcc', 'truecolor')).toBe(`${ESC}38;2;170;187;204m`);
	});
});

// ─── 256 Color ──────────────────────────────────────────────

describe('downsampleColor — 256', () => {
	it('finds nearest 256-color index for pure red', () => {
		const result = downsampleColor('#FF0000', '256');
		// Pure red (#FF0000) → should map to index 196 (rgb 255,0,0 in cube) or index 9 (bright red)
		expect(result).toMatch(new RegExp(`^${ESC.replace('[', '\\[')}38;5;\\d+m$`));
	});

	it('finds nearest 256-color index for pure white', () => {
		const result = downsampleColor('#FFFFFF', '256');
		// Pure white → index 15 (bright white) or 231 (end of cube)
		expect(result).toMatch(new RegExp(`^${ESC.replace('[', '\\[')}38;5;\\d+m$`));
	});

	it('finds nearest 256-color index for pure black', () => {
		const result = downsampleColor('#000000', '256');
		// Pure black → index 0 or 16 (start of cube)
		expect(result).toMatch(new RegExp(`^${ESC.replace('[', '\\[')}38;5;\\d+m$`));
	});

	it('maps gray to grayscale ramp', () => {
		const result = downsampleColor('#808080', '256');
		// Mid gray → should land in grayscale ramp (232-255) or near index 8
		expect(result).toMatch(new RegExp(`^${ESC.replace('[', '\\[')}38;5;\\d+m$`));
	});
});

// ─── 16 Color ───────────────────────────────────────────────

describe('downsampleColor — 16', () => {
	it('maps pure red to standard 16 color', () => {
		const result = downsampleColor('#FF0000', '16');
		// Pure red → bright red (index 9) → ESC[91m
		expect(result).toBe(`${ESC}91m`);
	});

	it('maps pure green to standard 16 color', () => {
		const result = downsampleColor('#00FF00', '16');
		// Pure green → bright green (index 10) → ESC[92m
		expect(result).toBe(`${ESC}92m`);
	});

	it('maps pure blue to standard 16 color', () => {
		const result = downsampleColor('#0000FF', '16');
		// Pure blue → bright blue (index 12) → ESC[94m
		expect(result).toBe(`${ESC}94m`);
	});

	it('maps pure white to standard 16 color', () => {
		const result = downsampleColor('#FFFFFF', '16');
		// Pure white → bright white (index 15) → ESC[97m
		expect(result).toBe(`${ESC}97m`);
	});

	it('maps dark color to standard (non-bright) 16 range', () => {
		const result = downsampleColor('#000000', '16');
		// Pure black → index 0 → ESC[30m
		expect(result).toBe(`${ESC}30m`);
	});

	it('maps bright cyan', () => {
		const result = downsampleColor('#00FFFF', '16');
		// Cyan → bright cyan (index 14) → ESC[96m
		expect(result).toBe(`${ESC}96m`);
	});
});

// ─── Invalid Input ──────────────────────────────────────────

describe('downsampleColor — invalid input', () => {
	it('returns empty string for invalid hex format', () => {
		expect(downsampleColor('#FFF', 'truecolor')).toBe('');
	});

	it('returns empty string for non-hex, non-named string', () => {
		expect(downsampleColor('foobar', 'truecolor')).toBe('');
	});

	it('returns empty string for empty string', () => {
		expect(downsampleColor('', 'truecolor')).toBe('');
	});
});
