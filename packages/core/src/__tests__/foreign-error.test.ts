/**
 * An error from another copy of core, as a plugin that brings its own, ends
 * as one of ours (T-254): isRunaError knew it, but the exit code and the
 * message were decided by instanceof, so it came out as an unexpected error
 * with exit 1.
 */
import { describe, expect, it } from 'vitest';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

/** What another copy's error is: another class, with the same global mark and name */
function foreign(name: string, message: string, code: string, exitCode: number): Error {
	const error = new Error(message);
	error.name = name;
	Object.assign(error, { code, exitCode });
	Object.defineProperty(error, Symbol.for('@runa-cmd/core:RunaError'), { value: true });
	return error;
}

const cliThrowing = (error: Error) =>
	defineCLI({
		meta: { name: 'tool' },
		commands: {
			boom: defineCommand({
				meta: { description: 'Boom' },
				run: () => {
					throw error;
				},
			}),
		},
	});

describe('an error from another copy of core', () => {
	it('a CommandError keeps its exit code and its message, as written', async () => {
		const result = await testCLI(
			cliThrowing(foreign('CommandError', 'Environment is locked', 'LOCKED', 3)),
			['boom'],
		);

		expect(result.code).toBe(3);
		expect(result.stderr).toBe('Environment is locked\n');
	});

	it('a ValidationError is a usage error, with the hint to read the help', async () => {
		const result = await testCLI(
			cliThrowing(foreign('ValidationError', 'Invalid value for --x', 'VALIDATION_ERROR', 2)),
			['boom'],
		);

		expect(result.code).toBe(2);
		expect(result.stderr).toContain("Run 'tool boom --help' for usage.");
	});

	it('a plain Error is still unexpected', async () => {
		const result = await testCLI(cliThrowing(new Error('disk on fire')), ['boom']);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Unexpected error in 'boom': disk on fire");
	});
});
