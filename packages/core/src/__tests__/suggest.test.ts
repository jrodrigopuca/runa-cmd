/**
 * Unit tests for did-you-mean suggestions (suggest.ts): a wrong suggestion
 * confuses more than none, so the allowed distance grows with the input.
 */
import { describe, expect, it } from 'vitest';
import { findSuggestion } from '../suggest.js';

describe('findSuggestion', () => {
	it.each([
		['outptu', ['output', 'size'], 'output'],
		['forse', ['force', 'env'], 'force'],
		['hepl', ['help', 'env'], 'help'],
		['verbse', ['verbose'], 'verbose'],
		['replcias', ['replicas'], 'replicas'],
		['dpeloy', ['deploy', 'init'], 'deploy'],
	])('suggests a real typo: %s → %s', (input, candidates, expected) => {
		expect(findSuggestion(input, candidates)).toBe(expected);
	});

	it.each([
		['nope', ['size', 'ecl', 'output']],
		['help', ['ecl', 'size']],
		['x', ['y', 'force']],
		['ab', ['cd']],
		['zzzzzzzzzz', ['force']],
	])('stays quiet on an unrelated input: %s', (input, candidates) => {
		expect(findSuggestion(input, candidates)).toBeUndefined();
	});

	it('caps the distance at 3 for long inputs', () => {
		expect(findSuggestion('abcdefghij', ['abcdefgxyz'])).toBe('abcdefgxyz');
		expect(findSuggestion('abcdefghij', ['abcdefwxyz'])).toBeUndefined();
	});

	it('returns nothing without candidates', () => {
		expect(findSuggestion('force', [])).toBeUndefined();
	});
});
