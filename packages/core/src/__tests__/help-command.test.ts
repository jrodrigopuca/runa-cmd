/**
 * `help` where a command name goes is `--help` (T-243, ADR-0048), as in
 * commander, yargs, cac and oclif. People and models type it: `tool help`
 * gave 127 and suggested another command.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { ERROR_CODES, isRunaError } from '../errors.js';
import { testCLI } from '../testing.js';
import type { CommandTree } from '../types.js';

const deploy = defineCommand({
	meta: { description: 'Deploy a service' },
	args: { service: z.string().optional() },
	run: () => 'deployed',
});
const greet = defineCommand({
	meta: { description: 'Say hello' },
	args: { name: z.string() },
	run: ({ args }) => `Hello ${args.name}`,
});
const migrate = defineCommand({ meta: { description: 'Run migrations' }, run: () => 'migrated' });

const cliWith = (commands: CommandTree) =>
	defineCLI({
		meta: { name: 'tool', version: '1.0.0', description: 'A tool' },
		commands,
		globalOptions: { verbose: z.boolean().default(false) },
	});
const cli = cliWith({ deploy, greet, db: { migrate } });

describe('help as a command', () => {
	it('tool help shows the help of the CLI, as --help does', async () => {
		const asCommand = await testCLI(cli, ['help']);
		const asFlag = await testCLI(cli, ['--help']);

		expect(asCommand.code).toBe(0);
		expect(asCommand.stderr).toBe('');
		expect(asCommand.stdout).toBe(asFlag.stdout);
	});

	it.each([
		[
			['help', 'deploy'],
			['deploy', '--help'],
		],
		[
			['help', 'db', 'migrate'],
			['db', 'migrate', '--help'],
		],
		[
			['db', 'help'],
			['db', '--help'],
		],
		[
			['help', 'db'],
			['db', '--help'],
		],
		[
			['--verbose', 'help', 'deploy'],
			['deploy', '--help'],
		],
	])('%j is %j', async (argv, same) => {
		const asCommand = await testCLI(cli, argv);
		const asFlag = await testCLI(cli, same);

		expect(asCommand.code).toBe(0);
		expect(asCommand.stdout).toBe(asFlag.stdout);
	});

	it('a command that does not exist after it is reported as any other', async () => {
		const result = await testCLI(cli, ['help', 'deplo']);

		expect(result.code).toBe(127);
		expect(result.stderr).toContain("Command not found: 'deplo'. Did you mean 'deploy'?");
		expect(isRunaError(result.error, ERROR_CODES.COMMAND_NOT_FOUND)).toBe(true);
	});

	it("in a command's own words, help is a value", async () => {
		const result = await testCLI(cli, ['greet', 'help']);
		expect(result.result).toBe('Hello help');
	});

	it('a command of the CLI named help runs', async () => {
		const own = defineCommand({ meta: { description: 'Our own help' }, run: () => 'our help' });
		const result = await testCLI(cliWith({ deploy, help: own }), ['help']);
		expect(result.result).toBe('our help');
	});

	it('a command that took --help as an option still shows its help, through -h', async () => {
		const serve = defineCommand({
			meta: { description: 'Serve' },
			options: { help: z.string().optional() },
			run: () => 'served',
		});
		const result = await testCLI(cliWith({ serve }), ['help', 'serve']);

		expect(result.code).toBe(0);
		expect(result.result).toBeUndefined();
		expect(result.stdout).toContain('Serve');
	});
});
