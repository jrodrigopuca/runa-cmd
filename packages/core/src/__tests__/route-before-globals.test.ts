/**
 * Where argv leads is said before a missing global option (T-253): with a
 * required global, `tool nope` said `Missing required option` with exit 2,
 * against ADR-0034 and ADR-0048. Nothing runs either way, so the global
 * isn't needed to answer.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const migrate = defineCommand({ meta: { description: 'Migrate' }, run: () => 'migrated' });
const status = defineCommand({ meta: { description: 'Status' }, run: () => 'ok' });

const cli = defineCLI({
	meta: { name: 'tool', description: 'A tool' },
	globalOptions: { token: z.string().describe('API token') },
	commands: { status, db: { migrate } },
});

describe('a route that runs nothing, with a required global missing', () => {
	it.each([
		[['nope'], "Command not found: 'nope'"],
		[['db', 'nope'], "Command not found: 'db nope'"],
		[['help', 'nope'], "Command not found: 'nope'"],
		[['statsu'], "Did you mean 'status'?"],
	])('%j is a 127, with its suggestion', async (argv, message) => {
		const result = await testCLI(cli, argv);

		expect(result.code).toBe(127);
		expect(result.stderr).toContain(message);
		expect(result.stderr).not.toContain('--token');
	});

	it.each([[[]], [['db']]])('%j shows the help on stderr, with exit 2', async (argv) => {
		const result = await testCLI(cli, argv);

		expect(result.code).toBe(2);
		expect(result.stderr).toContain('USAGE');
		expect(result.stderr).not.toContain('Missing required option');
	});
});

describe('a command that exists, with a required global missing', () => {
	it('still says the global is missing, with exit 2', async () => {
		const result = await testCLI(cli, ['status']);

		expect(result.code).toBe(2);
		expect(result.stderr).toContain('Missing required option: --token');
	});

	it('runs with the global', async () => {
		expect((await testCLI(cli, ['status', '--token', 'x'])).result).toBe('ok');
	});
});
