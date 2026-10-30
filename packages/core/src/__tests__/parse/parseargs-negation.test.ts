/**
 * Pinning tests for util.parseArgs negation-key representation
 *
 * These tests call node:util parseArgs DIRECTLY to pin the behavior the
 * strict-options check (parse/strict.ts) and the known-key construction
 * (parse/parseargs-bridge.ts) rely on. With a single Node line in CI
 * (Node 24, ADR-0015), this test IS the oracle: if a future Node version
 * changes the representation, this file fails first and points at the
 * `booleanKeys` defensive allowance in parse/strict.ts (ADR-0011).
 *
 * Observed representation (Node 24.x, pinned 2026-07-18):
 * - Registered boolean `x` + allowNegative + `--no-x`  → values = { x: false }
 *   (the `no-x` key never appears; parseArgs folds the negation)
 * - UNREGISTERED `--no-y` + strict: false + allowNegative → values = { y: false }
 *   (parseArgs folds negation even for unregistered keys — the produced key
 *   is `y`, NOT `no-y`; strict checking therefore sees the bare name)
 */
import { parseArgs } from 'node:util';
import { describe, expect, it } from 'vitest';

describe('util.parseArgs negation-key representation (pinned)', () => {
	it('registered boolean with allowNegative: --no-x folds to x: false, no no-x key', () => {
		const { values } = parseArgs({
			options: { x: { type: 'boolean' } },
			args: ['--no-x'],
			strict: false,
			allowNegative: true,
		});

		expect(values['x']).toBe(false);
		expect('no-x' in values).toBe(false);
	});

	it('UNREGISTERED --no-y under strict: false + allowNegative folds to y: false', () => {
		// This is the unknown the booleanKeys allowance hedges against.
		// Pinned: the produced key is `y` (folded), NOT `no-y`. The known-key
		// set in parseargs-bridge still carries `no-{name}` per boolean as a
		// defensive allowance in case a future Node line stops folding.
		const { values } = parseArgs({
			options: { x: { type: 'boolean' } },
			args: ['--no-y'],
			strict: false,
			allowNegative: true,
		});

		expect(values['y']).toBe(false);
		expect('no-y' in values).toBe(false);
	});

	it('registered boolean default + --no-x still yields x: false', () => {
		const { values } = parseArgs({
			options: { x: { type: 'boolean', default: true } },
			args: ['--no-x'],
			strict: false,
			allowNegative: true,
		});

		expect(values['x']).toBe(false);
	});

	it('unregistered plain long flag produces its bare key (context for strict checking)', () => {
		const { values } = parseArgs({
			options: { force: { type: 'boolean' } },
			args: ['--forse'],
			strict: false,
			allowNegative: true,
		});

		expect(values['forse']).toBe(true);
	});
});
