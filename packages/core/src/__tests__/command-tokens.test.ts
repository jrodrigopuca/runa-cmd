/**
 * Two names for the same thing inside a command stop the CLI at startup, as
 * OPTION_COLLISION says (T-252). They were only compared against the globals:
 * a duplicated alias kept the first one, and an alias equal to its own flag
 * threw away the value that was typed.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { ERROR_CODES, isRunaError } from '../errors.js';
import { definePlugin, validateCommandTokens } from '../plugin.js';
import { testCLI } from '../testing.js';
import type { OptionMeta } from '../types.js';

const deployWith = (meta: Record<string, OptionMeta>, options: Record<string, z.ZodType>) =>
	defineCommand({ meta: { description: 'Deploy', options: meta }, options, run: () => 'ok' });

const errorOf = (fn: () => void): Error | undefined => {
	try {
		fn();
	} catch (error) {
		return error as Error;
	}
	return undefined;
};

describe('options of a command that claim the same token', () => {
	it.each([
		[
			'two options with the same alias',
			{ env: { alias: ['-e'] }, extra: { alias: ['-e'] } },
			{ env: z.string().optional(), extra: z.string().optional() },
			// The option with the alias first, then the one that already had the token
			"Options 'extra' and 'env' of command 'deploy' both use '-e'.",
		],
		[
			"an alias equal to another option's flag",
			{ env: { alias: ['--extra'] } },
			{ env: z.string().optional(), extra: z.string().optional() },
			"Options 'env' and 'extra' of command 'deploy' both use '--extra'.",
		],
		[
			"an alias equal to another boolean's negation",
			{ other: { alias: ['--no-cache'] } },
			{ other: z.string().optional(), cache: z.boolean().default(true) },
			"Options 'other' and 'cache' of command 'deploy' both use '--no-cache'.",
		],
		[
			'an alias equal to its own flag',
			{ env: { alias: ['--env'] } },
			{ env: z.string().default('DEFAULT') },
			"Option 'env' of command 'deploy' has '--env' as an alias, which is already its flag. Remove the alias.",
		],
	])('%s stops the CLI', (_case, meta, options, message) => {
		const error = errorOf(() => validateCommandTokens({ deploy: deployWith(meta, options) }));

		expect(isRunaError(error, ERROR_CODES.OPTION_COLLISION)).toBe(true);
		expect(error?.message).toBe(message);
	});

	it('names a nested command by its path', () => {
		const deploy = deployWith(
			{ env: { alias: ['-e'] }, extra: { alias: ['-e'] } },
			{ env: z.string().optional(), extra: z.string().optional() },
		);
		expect(errorOf(() => validateCommandTokens({ db: { deploy } }))?.message).toContain(
			"of command 'db deploy'",
		);
	});

	it('lets different aliases and flags be', () => {
		const deploy = deployWith(
			{ env: { alias: ['-e', '--environment'] }, extra: { alias: ['-x'] } },
			{
				env: z.string().optional(),
				extra: z.string().optional(),
				cache: z.boolean().default(true),
			},
		);
		expect(errorOf(() => validateCommandTokens({ deploy }))).toBeUndefined();
	});

	it('stops a real CLI before anything runs, with exit 1', async () => {
		const deploy = deployWith(
			{ env: { alias: ['--env'] } },
			{ env: z.string().default('DEFAULT') },
		);
		const result = await testCLI(defineCLI({ meta: { name: 'tool' }, commands: { deploy } }), [
			'deploy',
			'--env',
			'prod',
		]);

		expect(result.code).toBe(1);
		expect(result.result).toBeUndefined();
	});

	it('covers a command that a plugin adds', async () => {
		const plugin = definePlugin({
			meta: { name: 'adds' },
			capabilities: { addCommands: true },
			setup(api) {
				api.addCommand(
					'extra',
					deployWith(
						{ a: { alias: ['-e'] }, b: { alias: ['-e'] } },
						{ a: z.string().optional(), b: z.string().optional() },
					),
				);
			},
		});
		const cli = defineCLI({
			meta: { name: 'tool' },
			commands: { ok: deployWith({}, {}) },
			plugins: [plugin],
		});
		const result = await testCLI(cli, ['ok']);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("of command 'extra' both use '-e'");
	});
});
