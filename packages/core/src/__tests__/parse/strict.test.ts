/**
 * Unit tests for strict unknown-option checking (parse/strict.ts)
 *
 * Tests: assertKnownOptions() — the single place unknown-flag rejection lives.
 * References: specs.md Requirement 1.2, design.md D3/D4.
 */
import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../errors.js';
import { assertKnownOptions } from '../../parse/strict.js';

function input(overrides: Partial<Parameters<typeof assertKnownOptions>[0]> = {}) {
	return {
		producedKeys: [],
		knownKeys: new Set<string>(),
		booleanKeys: new Set<string>(),
		suggestionCandidates: [],
		...overrides,
	};
}

describe('assertKnownOptions', () => {
	it('does not throw when all produced keys are known', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['force', 'replicas'],
					knownKeys: new Set(['force', 'replicas']),
				}),
			),
		).not.toThrow();
	});

	it('does not throw on empty produced keys', () => {
		expect(() => assertKnownOptions(input())).not.toThrow();
	});

	it('throws ValidationError (exit 2) for an unknown long flag', () => {
		try {
			assertKnownOptions(
				input({
					producedKeys: ['typo-flag'],
					knownKeys: new Set(['force']),
				}),
			);
			expect.unreachable('should have thrown');
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			const validationErr = err as ValidationError;
			expect(validationErr.exitCode).toBe(2);
			expect(validationErr.message).toContain('Unknown option: --typo-flag');
		}
	});

	it('renders single-character unknown keys as -x', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['x'],
					knownKeys: new Set(['force']),
				}),
			),
		).toThrow(/Unknown option: -x(?!-)/);
	});

	it('accepts alias keys present in knownKeys', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['environment'],
					knownKeys: new Set(['env', 'environment']),
				}),
			),
		).not.toThrow();
	});

	it('accepts no-* negation keys via knownKeys (bridge allowance)', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['no-verbose'],
					knownKeys: new Set(['verbose', 'no-verbose']),
				}),
			),
		).not.toThrow();
	});

	it('accepts no-* keys defensively via booleanKeys even when absent from knownKeys', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['no-verbose'],
					knownKeys: new Set(['verbose']),
					booleanKeys: new Set(['verbose']),
				}),
			),
		).not.toThrow();
	});

	it('rejects no-* keys whose base is not a boolean option', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['no-verbose'],
					knownKeys: new Set(['force']),
					booleanKeys: new Set(['force']),
				}),
			),
		).toThrow(/Unknown option: --no-verbose/);
	});

	it('appends a did-you-mean suggestion within distance 3', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['forse'],
					knownKeys: new Set(['force']),
					suggestionCandidates: ['force', 'replicas'],
				}),
			),
		).toThrow("Unknown option: --forse. Did you mean '--force'?");
	});

	it('omits the suggestion clause beyond distance 3', () => {
		try {
			assertKnownOptions(
				input({
					producedKeys: ['zzzzzzzzzz'],
					knownKeys: new Set(['force']),
					suggestionCandidates: ['force', 'replicas'],
				}),
			);
			expect.unreachable('should have thrown');
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).message).toContain('Unknown option: --zzzzzzzzzz');
			expect((err as ValidationError).message).not.toContain('Did you mean');
		}
	});

	it('omits the suggestion clause when suggestionCandidates is empty', () => {
		try {
			assertKnownOptions(
				input({
					producedKeys: ['forse'],
					knownKeys: new Set(['force']),
					suggestionCandidates: [],
				}),
			);
			expect.unreachable('should have thrown');
		} catch (err) {
			expect((err as ValidationError).message).not.toContain('Did you mean');
		}
	});

	it('throws on the FIRST unknown key when several are unknown', () => {
		expect(() =>
			assertKnownOptions(
				input({
					producedKeys: ['known', 'first-bad', 'second-bad'],
					knownKeys: new Set(['known']),
				}),
			),
		).toThrow(/first-bad/);
	});
});
