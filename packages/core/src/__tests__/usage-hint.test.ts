/**
 * After a usage error, the hint points to the help that answers it: the
 * command's, when the error is about a command (T-227). It used to say
 * `Run 'tool --help'` even for `tool build --limit 0`.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const build = defineCommand({
	meta: { description: 'Build' },
	options: { limit: z.number().positive().default(1) },
	run: () => 'built',
});
const migrate = defineCommand({ meta: { description: 'Migrate' }, run: () => 'migrated' });

const cli = defineCLI({
	meta: { name: 'tool', description: 'Probe' },
	commands: { build, db: { migrate } },
});

const hint = async (target: Parameters<typeof testCLI>[0], argv: string[]) => {
	const { code, stderr } = await testCLI(target, argv);
	expect(code).not.toBe(0);
	return stderr.trim().split('\n').at(-1);
};

describe('the hint after a usage error', () => {
	it.each([
		[['build', '--limit', '0'], "Run 'tool build --help' for usage."],
		[['build', '--nope'], "Run 'tool build --help' for usage."],
		[['db', 'migrate', '--nope'], "Run 'tool db migrate --help' for usage."],
	])('points to the help of the command for %j', async (argv, expected) => {
		expect(await hint(cli, argv)).toBe(expected);
	});

	it('points to the help of the CLI when no command was found', async () => {
		expect(await hint(cli, ['nothing'])).toBe("Run 'tool --help' for usage.");
	});

	it('points to the help of the CLI when the command is the CLI, as with runCLI', async () => {
		const single = defineCommand({
			meta: { name: 'tool', description: 'One command' },
			options: { limit: z.number().positive().default(1) },
			run: () => 'ok',
		});
		expect(await hint(single, ['--limit', '0'])).toBe("Run 'tool --help' for usage.");
	});
});
