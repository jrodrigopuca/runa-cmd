/**
 * @runa-cmd/help — Terminal detection
 *
 * Detects terminal color depth and width from environment variables
 * and process.stdout capabilities.
 */
import type { ColorDepth, RenderContext } from '../types.js';

/**
 * Detect terminal color depth from env vars and stdout capabilities.
 *
 * Priority order:
 * 1. NO_COLOR → 'none'
 * 2. FORCE_COLOR → minimum '16'
 * 3. COLORTERM=truecolor|24bit → 'truecolor'
 * 4. TERM=xterm-256color → '256'
 * 5. process.stdout.hasColors(256) → '256'
 * 6. process.stdout.hasColors(16) → '16'
 * 7. fallback → 'none'
 */
export function detectColorDepth(): ColorDepth {
	const env = process.env;

	// NO_COLOR takes absolute priority (https://no-color.org/)
	if (env.NO_COLOR !== undefined) {
		return 'none';
	}

	// FORCE_COLOR forces color output (e.g. in CI or piped contexts)
	const forceColor = env.FORCE_COLOR;
	if (forceColor !== undefined) {
		if (forceColor === '3') return 'truecolor';
		if (forceColor === '2') return '256';
		return '16';
	}

	// Non-TTY (piped) → no color unless FORCE_COLOR was set (handled above)
	if (!process.stdout.isTTY) {
		return 'none';
	}

	// COLORTERM for truecolor detection
	const colorTerm = env.COLORTERM;
	if (colorTerm === 'truecolor' || colorTerm === '24bit') {
		return 'truecolor';
	}

	// TERM for 256 color detection
	const term = env.TERM;
	if (term?.includes('256color')) {
		return '256';
	}

	// process.stdout.hasColors() as additional signal
	if (typeof process.stdout.hasColors === 'function') {
		if (process.stdout.hasColors(16_777_216)) return 'truecolor';
		if (process.stdout.hasColors(256)) return '256';
		if (process.stdout.hasColors(16)) return '16';
	}

	return 'none';
}

/**
 * Detect terminal width in columns.
 * Falls back to 80 if unavailable (e.g. piped output).
 */
export function detectTermWidth(): number {
	return process.stdout.columns ?? 80;
}

// ─── Lazy Singleton ─────────────────────────────────────────

let _cached: RenderContext | undefined;

/**
 * Get the current RenderContext (lazy singleton — auto-detected once).
 * All primitives use this internally when no explicit ctx is passed.
 */
export function getRenderContext(): RenderContext {
	if (!_cached) {
		_cached = {
			colorDepth: detectColorDepth(),
			termWidth: detectTermWidth(),
		};
	}
	return _cached;
}

/**
 * Reset the cached RenderContext.
 * Used in tests to force re-detection.
 */
export function resetRenderContext(): void {
	_cached = undefined;
}
