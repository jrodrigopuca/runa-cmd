/**
 * Hooks, middleware and run() know which command runs, by its whole path (T-226):
 * `tag add` and `add` share a name, and a permissions or audit plugin can't
 * tell them apart by the name alone.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { defineMiddleware } from '../middleware.js';
import { definePlugin } from '../plugin.js';
import { testCLI } from '../testing.js';

const seen: string[] = [];

const recorder = definePlugin({
	meta: { name: 'recorder', version: '1.0.0' },
	setup(api) {
		api.hook('beforeRun', (ctx) => {
			seen.push(`hook ${ctx.command?.path.join(' ')} (${ctx.command?.name})`);
		});
	},
});

const audit = defineMiddleware(async ({ command, next }) => {
	seen.push(`middleware ${command.path.join(' ')} (${command.name})`);
	await next();
});

const add = defineCommand({
	meta: { description: 'Add' },
	args: { value: z.string().optional() },
	run: ({ command }) => {
		seen.push(`run ${command.path.join(' ')} (${command.name})`);
	},
});

const cli = defineCLI({
	meta: { name: 'notes' },
	commands: { add, tag: { add } },
	middleware: [audit],
	plugins: [recorder],
});

async function trail(argv: string[]) {
	seen.length = 0;
	const result = await testCLI(cli, argv);
	expect(result.code, result.stderr).toBe(0);
	return [...seen];
}

describe('the path of the command that runs', () => {
	it('tells a nested command apart from one with the same name', async () => {
		expect(await trail(['tag', 'add'])).toEqual([
			'hook tag add (add)',
			'middleware tag add (add)',
			'run tag add (add)',
		]);
		expect(await trail(['add'])).toEqual([
			'hook add (add)',
			'middleware add (add)',
			'run add (add)',
		]);
	});

	it('is the path of the command, without the CLI', async () => {
		expect((await trail(['tag', 'add']))[0]).toBe('hook tag add (add)');
	});

	it('names the command of a CLI of one command', async () => {
		const single = defineCommand({
			meta: { name: 'beacon', description: 'One command' },
			run: ({ command }) => {
				seen.push(`run ${command.path.join(' ')} (${command.name})`);
			},
		});

		seen.length = 0;
		const result = await testCLI(single, [], { middleware: [audit] });
		expect(result.code, result.stderr).toBe(0);
		expect(seen).toEqual(['middleware beacon (beacon)', 'run beacon (beacon)']);
	});
});
