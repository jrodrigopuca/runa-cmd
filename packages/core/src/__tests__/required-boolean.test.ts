/**
 * A z.boolean() without .default() or .optional() was required, so a flag
 * that isn't passed failed every run with `Missing required option: --shout`.
 * The author learns it at startup instead, with the fix (T-256).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { ERROR_CODES, isRunaError } from '../errors.js';
import { testCLI } from '../testing.js';

const hello = (shout: z.ZodType) =>
	defineCommand({ meta: { description: 'Say hello' }, options: { shout }, run: () => 'hi' });

describe('a boolean option', () => {
	it('without a default stops the CLI at startup, saying how to fix it', async () => {
		const cli = defineCLI({ meta: { name: 'greet' }, commands: { hello: hello(z.boolean()) } });
		const result = await testCLI(cli, ['hello']);

		expect(result.code).toBe(1);
		expect(isRunaError(result.error, ERROR_CODES.INVALID_BOOLEAN_OPTION)).toBe(true);
		expect(result.stderr).toContain(
			"Boolean option 'shout' of command 'hello' has no default: a flag that isn't passed needs one. Use z.boolean().default(false), or .optional().",
		);
	});

	it('as a global, says it of the CLI', async () => {
		const cli = defineCLI({
			meta: { name: 'greet' },
			globalOptions: { verbose: z.boolean() },
			commands: { hello: hello(z.boolean().default(false)) },
		});
		const result = await testCLI(cli, ['hello']);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Boolean option 'verbose' of the CLI has no default");
	});

	it('with runCLI, too', async () => {
		const result = await testCLI(hello(z.boolean()), []);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Boolean option 'shout'");
	});

	it.each([
		['.default(false)', z.boolean().default(false)],
		['.default(true)', z.boolean().default(true)],
		['.optional()', z.boolean().optional()],
	])('with %s is fine', async (_case, shout) => {
		const cli = defineCLI({ meta: { name: 'greet' }, commands: { hello: hello(shout) } });
		const result = await testCLI(cli, ['hello', '--shout']);

		expect(result.code).toBe(0);
	});
});
