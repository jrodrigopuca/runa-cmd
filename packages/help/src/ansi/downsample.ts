/**
 * @runa-cmd/help — Color downsampling
 *
 * Converts hex colors (#RRGGBB) to the appropriate ANSI escape sequence
 * based on the terminal's color depth. Named attributes (e.g. 'dim')
 * pass through unchanged.
 *
 * ANSI 256 palette: 6×6×6 RGB cube (indices 16-231) + 24 grayscale (232-255).
 * Computed programmatically at module load, not hardcoded.
 */
import type { ColorDepth } from '../types.js';

// ─── Hex Parsing ────────────────────────────────────────────

const HEX_RE = /^#([0-9a-f]{6})$/i;

function parseHex(hex: string): [r: number, g: number, b: number] | null {
	const match = HEX_RE.exec(hex);
	if (!match) return null;
	const val = Number.parseInt(match[1], 16);
	return [(val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
}

// ─── ANSI 256 Palette (computed once at module load) ────────

interface PaletteEntry {
	r: number;
	g: number;
	b: number;
	index: number;
}

const PALETTE_256: PaletteEntry[] = [];

// Standard 16 colors (indices 0-15)
const STANDARD_16: Array<[r: number, g: number, b: number]> = [
	[0, 0, 0], // 0: black
	[128, 0, 0], // 1: red
	[0, 128, 0], // 2: green
	[128, 128, 0], // 3: yellow
	[0, 0, 128], // 4: blue
	[128, 0, 128], // 5: magenta
	[0, 128, 128], // 6: cyan
	[192, 192, 192], // 7: white
	[128, 128, 128], // 8: bright black (gray)
	[255, 0, 0], // 9: bright red
	[0, 255, 0], // 10: bright green
	[255, 255, 0], // 11: bright yellow
	[0, 0, 255], // 12: bright blue
	[255, 0, 255], // 13: bright magenta
	[0, 255, 255], // 14: bright cyan
	[255, 255, 255], // 15: bright white
];

// Build standard 16
for (let i = 0; i < 16; i++) {
	const [r, g, b] = STANDARD_16[i];
	PALETTE_256.push({ r, g, b, index: i });
}

// 6×6×6 RGB cube (indices 16-231)
const CUBE_STEPS = [0, 95, 135, 175, 215, 255];
for (let ri = 0; ri < 6; ri++) {
	for (let gi = 0; gi < 6; gi++) {
		for (let bi = 0; bi < 6; bi++) {
			PALETTE_256.push({
				r: CUBE_STEPS[ri],
				g: CUBE_STEPS[gi],
				b: CUBE_STEPS[bi],
				index: 16 + ri * 36 + gi * 6 + bi,
			});
		}
	}
}

// Grayscale ramp (indices 232-255)
for (let i = 0; i < 24; i++) {
	const v = 8 + i * 10;
	PALETTE_256.push({ r: v, g: v, b: v, index: 232 + i });
}

// ─── Nearest Color Search ───────────────────────────────────

function nearestIndex(r: number, g: number, b: number, palette: PaletteEntry[]): number {
	let bestDist = Number.POSITIVE_INFINITY;
	let bestIndex = 0;

	for (const entry of palette) {
		const dr = r - entry.r;
		const dg = g - entry.g;
		const db = b - entry.b;
		const dist = dr * dr + dg * dg + db * db;
		if (dist < bestDist) {
			bestDist = dist;
			bestIndex = entry.index;
		}
	}
	return bestIndex;
}

// ─── Named ANSI Attributes ─────────────────────────────────

const ESC = '\x1b[';

const NAMED_ATTRS: Record<string, string> = {
	bold: `${ESC}1m`,
	dim: `${ESC}2m`,
	italic: `${ESC}3m`,
	underline: `${ESC}4m`,
	red: `${ESC}31m`,
	green: `${ESC}32m`,
	yellow: `${ESC}33m`,
	blue: `${ESC}34m`,
	magenta: `${ESC}35m`,
	cyan: `${ESC}36m`,
	white: `${ESC}37m`,
};

// ─── Public API ─────────────────────────────────────────────

/**
 * Downsample a color to an ANSI escape string based on terminal color depth.
 *
 * - Hex colors (#RRGGBB) → converted to nearest ANSI code for the depth
 * - Named attributes ('dim', 'red', etc.) → passed through as ANSI escape
 * - If depth is 'none' → returns '' (empty, no color)
 *
 * Returns the ANSI escape STRING (without reset) — caller wraps text with it.
 */
export function downsampleColor(color: string, depth: ColorDepth): string {
	if (depth === 'none') return '';

	// Named attribute passthrough
	const named = NAMED_ATTRS[color];
	if (named) return named;

	// Parse hex
	const rgb = parseHex(color);
	if (!rgb) return '';

	const [r, g, b] = rgb;

	switch (depth) {
		case 'truecolor':
			return `${ESC}38;2;${r};${g};${b}m`;

		case '256': {
			// Search full 256 palette (16 + cube + grayscale)
			const idx = nearestIndex(r, g, b, PALETTE_256);
			return `${ESC}38;5;${idx}m`;
		}

		case '16': {
			// Search only the standard 16 colors
			const idx = nearestIndex(r, g, b, PALETTE_256.slice(0, 16));
			if (idx >= 8) {
				// Bright colors: use 90-97 range
				return `${ESC}${90 + (idx - 8)}m`;
			}
			return `${ESC}${30 + idx}m`;
		}
	}
}
