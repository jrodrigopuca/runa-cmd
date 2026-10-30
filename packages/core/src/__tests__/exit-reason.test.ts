/**
 * Unit tests for the message shown when a CLI exits on an error (ADR-0027).
 * The end-to-end behavior lives in acceptance/failure-exit.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { CommandError, describeFailure, isDebugEnabled, RunaError } from '../errors.js';

const HINT = 'Run with RUNA_DEBUG=1 for details.';

describe('describeFailure', () => {
	it('shows a typed error exactly as written', () => {
		const error = new CommandError('Environment is locked');
		expect(describeFailure(error, 'deploy', false)).toBe('Environment is locked');
	});

	it('names the command in an unexpected error and adds the hint', () => {
		expect(describeFailure(new Error('kaboom'), 'deploy', false)).toBe(
			`Unexpected error in 'deploy': kaboom\n${HINT}`,
		);
	});

	it.each([
		['an empty message', ''],
		['a blank message', '   '],
	])('never returns an empty reason for %s', (_case, message) => {
		expect(describeFailure(new Error(message), 'deploy', false)).toBe(
			`'deploy' failed without an error message (Error).\n${HINT}`,
		);
	});

	it('treats a typed error without a message as a defect, naming its type', () => {
		expect(describeFailure(new CommandError(''), 'deploy', false)).toContain(
			"'deploy' failed without an error message (CommandError).",
		);
	});

	it('in debug mode replaces the hint with the stack', () => {
		const output = describeFailure(new Error('kaboom'), 'deploy', true);
		expect(output).toContain("Unexpected error in 'deploy': kaboom");
		expect(output).toMatch(/^\s+at /m);
		expect(output).not.toContain(HINT);
	});

	it('in debug mode includes the code of a typed error', () => {
		const error = new RunaError('Locked', { code: 'ENV_LOCKED' });
		expect(describeFailure(error, 'deploy', true)).toContain('Code: ENV_LOCKED');
	});

	it('in debug mode includes an Error cause with its stack', () => {
		const error = new Error('kaboom', { cause: new Error('disk full') });
		expect(describeFailure(error, 'deploy', true)).toContain('Caused by: Error: disk full');
	});

	it('in debug mode includes a cause that is not an Error', () => {
		const error = new Error('kaboom', { cause: 'disk full' });
		expect(describeFailure(error, 'deploy', true)).toContain('Caused by: disk full');
	});
});

describe('isDebugEnabled', () => {
	it.each([
		[undefined, false],
		['', false],
		['0', false],
		['1', true],
		['true', true],
	])('RUNA_DEBUG=%s → %s', (value, expected) => {
		expect(isDebugEnabled({ RUNA_DEBUG: value })).toBe(expected);
	});
});
