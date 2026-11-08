/**
 * A middleware that forgets next(), or doesn't await it, says so instead of
 * failing silently: the command would not run and still exit 0, or hooks and
 * cleanup would run while it still works.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { CommandError } from '../errors.js';
import { defineMiddleware } from '../middleware.js';
import { definePlugin } from '../plugin.js';
import { testCLI } from '../testing.js';

const steps: string[] = [];
const recorder = definePlugin({
	meta: { name: 'recorder' },
	setup(api) {
		api.hook('afterRun', () => {
			steps.push('afterRun');
		});
		api.hook('cleanup', () => {
			steps.push('cleanup');
		});
	},
});

const slow = defineCommand({
	meta: { description: 'Takes a moment' },
	options: { fail: z.boolean().default(false) },
	async run({ options }) {
		await new Promise((resolve) => setTimeout(resolve, 50));
		steps.push('run ended');
		if (options.fail) throw new Error('it broke');
		return 'done';
	},
});

const cliWith = (handler: Parameters<typeof defineMiddleware>[0]) =>
	defineCLI({
		meta: { name: 'tool' },
		commands: { slow },
		middleware: [defineMiddleware(handler)],
		plugins: [recorder],
	});

describe('a middleware that forgets next()', () => {
	it('fails, and says the command did not run', async () => {
		steps.length = 0;
		const result = await testCLI(
			cliWith(async () => {}),
			['slow'],
		);

		expect(result.code).toBe(1);
		expect((result.error as { code?: string }).code).toBe('MIDDLEWARE_DID_NOT_CALL_NEXT');
		expect(result.stderr).toContain(
			"A middleware returned without calling next(): 'slow' didn't run. Call await next(), or throw an error to stop the command.",
		);
		expect(steps).not.toContain('run ended');
		expect(steps).not.toContain('afterRun');
	});

	it('can still stop the command on purpose, by throwing', async () => {
		const result = await testCLI(
			cliWith(async () => {
				throw new CommandError('Dry run: would run slow', { exitCode: 0 });
			}),
			['slow'],
		);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain('Dry run: would run slow');
	});
});

describe('a middleware that calls next() without await', () => {
	it('fails, after the command ends and before afterRun and cleanup', async () => {
		steps.length = 0;
		const result = await testCLI(
			cliWith(async ({ next }) => {
				void next();
			}),
			['slow'],
		);

		expect(result.code).toBe(1);
		expect((result.error as { code?: string }).code).toBe('MIDDLEWARE_DID_NOT_AWAIT_NEXT');
		expect(result.stderr).toContain(
			"A middleware didn't await next(): 'slow' was still running when it returned. Use await next().",
		);
		expect(steps).toEqual(['run ended', 'cleanup']);
	});

	it('keeps the error of the command as the cause', async () => {
		const result = await testCLI(
			cliWith(async ({ next }) => {
				next().catch(() => {});
			}),
			['slow', '--fail'],
		);

		expect((result.error as { code?: string }).code).toBe('MIDDLEWARE_DID_NOT_AWAIT_NEXT');
		expect((result.error as Error).cause).toEqual(new Error('it broke'));
	});
});

describe('a middleware that awaits next()', () => {
	it('runs as always', async () => {
		steps.length = 0;
		const result = await testCLI(
			cliWith(async ({ next }) => {
				await next();
			}),
			['slow'],
		);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('done\n');
		expect(steps).toEqual(['run ended', 'afterRun', 'cleanup']);
	});
});
