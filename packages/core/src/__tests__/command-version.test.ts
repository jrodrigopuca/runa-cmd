/**
 * meta.version only has an effect on the command that is the CLI, with
 * runCLI. In a command of defineCLI it did nothing, without a word, against
 * ADR-0029: it stops the CLI at startup instead (T-250).
 */
import { describe, expect, it } from 'vitest';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { ERROR_CODES, isRunaError } from '../errors.js';
import { testCLI } from '../testing.js';

const deploy = defineCommand({
	meta: { description: 'Deploy', version: '2.0.0' },
	run: () => 'deployed',
});

describe('meta.version on a command', () => {
	it('stops a CLI of several commands at startup, saying where it goes', async () => {
		const cli = defineCLI({ meta: { name: 'tool', version: '1.0.0' }, commands: { deploy } });
		const result = await testCLI(cli, ['deploy']);

		expect(result.code).toBe(1);
		expect(result.result).toBeUndefined();
		expect(isRunaError(result.error, ERROR_CODES.INVALID_COMMAND_VERSION)).toBe(true);
		expect(result.stderr).toContain(
			"Command 'deploy' declares meta.version: 'version' only applies with runCLI; set it in defineCLI's meta.",
		);
	});

	it('names a nested command by its path', async () => {
		const cli = defineCLI({ meta: { name: 'tool' }, commands: { db: { migrate: deploy } } });
		const result = await testCLI(cli, ['db', 'migrate']);

		expect(result.stderr).toContain("Command 'db migrate' declares meta.version");
	});

	// testCLI with a command runs it as runCLI does
	it('is the version of a CLI of one command', async () => {
		const result = await testCLI(deploy, ['--version']);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('2.0.0\n');
	});
});
