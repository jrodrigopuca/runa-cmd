/**
 * A wrong value is repeated in its error, as commander and oclif do, so the
 * person sees what they typed (T-246). Only what was typed or sent: never a
 * value from env or a config file, nor of an option that can come from env,
 * since those hold secrets and the error can end up in a CI log.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const deploy = defineCommand({
	meta: { name: 'deploy', description: 'Deploy', options: { token: { env: 'DEPLOY_TOKEN' } } },
	args: { replicas: z.number().optional() },
	options: {
		times: z.number().optional(),
		limit: z.number().positive().optional(),
		env: z.enum(['staging', 'production']).optional(),
		token: z.string().min(10).optional(),
		name: z.string().max(5).optional(),
	},
	run: () => 'ok',
});

const firstLine = async (argv: string[], env: Record<string, string> = {}) => {
	const { code, stderr } = await testCLI(deploy, argv, { env });
	expect(code).toBe(2);
	return stderr.split('\n')[0];
};

describe('a wrong value typed at the terminal', () => {
	it.each([
		[['--times', 'abc'], "Invalid value 'abc' for --times: expected number"],
		[['--env', 'mars'], "Invalid value 'mars' for --env. Expected one of: staging, production"],
		[['--limit', '0'], "Invalid value '0' for --limit: must be greater than 0"],
		[['many'], "Invalid value 'many' for <replicas>: expected number"],
	])('%j is repeated in the error', async (argv, message) => {
		expect(await firstLine(argv)).toBe(message);
	});

	it('is cut when it is long, so the error stays one line', async () => {
		const long = 'x'.repeat(80);
		const line = await firstLine(['--name', long]);
		expect(line).toBe(
			`Invalid value '${'x'.repeat(37)}...' for --name: must have at most 5 characters`,
		);
	});

	it('shows a newline as \\n, so the error stays one line', async () => {
		expect(await firstLine(['--times', 'a\nb'])).toBe(
			"Invalid value 'a\\nb' for --times: expected number",
		);
	});
});

describe('a wrong value that may be a secret', () => {
	it('from env is never shown', async () => {
		const line = await firstLine([], { DEPLOY_TOKEN: 'short' });
		expect(line).toBe('Invalid value for --token: must have at least 10 characters');
	});

	it('of an option that can come from env is not shown, even typed', async () => {
		const line = await firstLine(['--token', 'short']);
		expect(line).not.toContain('short');
	});

	it('from the config file is never shown', async () => {
		const cli = defineCLI({
			meta: { name: 'tool' },
			config: { name: 'tool' },
			commands: { deploy },
		});
		const { stderr } = await testCLI(cli, ['deploy'], { config: { deploy: { times: 'abc' } } });
		expect(stderr).not.toContain("'abc'");
	});
});
