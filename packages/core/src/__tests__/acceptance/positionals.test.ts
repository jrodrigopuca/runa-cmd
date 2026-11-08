/**
 * A schema behaves the same in args and in options (ADR-0013), through real
 * processes: `z.number()` says number, so a positional has to deliver one.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

beforeAll(assertFreshBuild);

const positionals = (...argv: string[]) => runFixture('positionals.js', argv);

const received = (...argv: string[]) => {
	const result = positionals(...argv);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
};

describe('a positional gets the type of its schema', () => {
	it.each([
		['a number', ['number', '5'], { id: 5 }],
		['a negative number, after --', ['number', '--', '-5'], { id: -5 }],
		['a decimal', ['number', '1.5'], { id: 1.5 }],
		['a boolean', ['flag', 'true'], { on: true }],
		['a false boolean', ['flag', '0'], { on: false }],
		['an optional number', ['optional', '5'], { id: 5 }],
		['a number with a default', ['fallback', '5'], { id: 5 }],
		['each item of a variadic', ['list', '1', '2', '3'], { ids: [1, 2, 3] }],
		['a variadic after another arg', ['mixed', 'a', '1', '2'], { name: 'a', ids: [1, 2] }],
	])('delivers %s', (_name, argv, expected) => {
		expect(received(...argv)).toEqual(expected);
	});

	it('leaves a string alone, even if it looks like a number', () => {
		expect(received('text', '007')).toEqual({ value: '007' });
	});

	it('takes the default when nothing is given', () => {
		expect(received('fallback')).toEqual({ id: 7 });
	});

	it('leaves an optional out', () => {
		expect(received('optional')).toEqual({});
	});

	it('delivers an empty variadic', () => {
		expect(received('list')).toEqual({ ids: [] });
	});
});

describe('an invalid value', () => {
	// The value typed is repeated (T-246), except for a list, which says nothing short
	it.each([
		['a word for a number', ['number', 'abc'], "Invalid value 'abc' for <id>"],
		['an empty string, never read as 0', ['number', ''], "Invalid value '' for <id>"],
		['a word for a boolean', ['flag', 'maybe'], "Invalid value 'maybe' for <on>"],
		['a bad item of a variadic', ['list', '1', 'x'], 'Invalid value for <ids>'],
	])('rejects %s, naming the argument', (_name, argv, message) => {
		const { status, stderr, stdout } = positionals(...argv);
		expect(status).toBe(2);
		expect(stdout).toBe('');
		expect(stderr).toContain(message);
		expect(stderr).not.toContain('Invalid input');
	});

	it('keeps the refinements of the schema', () => {
		const { status, stderr } = positionals('positive', '-1');
		expect(status).toBe(2);
		expect(stderr).toContain('-1');
	});

	it('keeps saying which one is missing', () => {
		const { status, stderr } = positionals('number');
		expect(status).toBe(2);
		expect(stderr).toContain('Missing required argument: <id>');
	});

	it('keeps listing the values of an enum', () => {
		expect(positionals('choice', 'mid').stderr).toContain('Expected one of: low, high');
	});
});
