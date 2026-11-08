/**
 * An alias that can't work stops the CLI at startup (T-244): `alias: ['e']`
 * showed `-e, --env` in the help, and `-e` was an unknown option.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { ERROR_CODES, isRunaError } from '../errors.js';
import { validateOptionAliases } from '../plugin.js';
import { testCLI } from '../testing.js';

const deployWith = (alias: string[]) =>
	defineCommand({
		meta: { description: 'Deploy', options: { env: { alias } } },
		options: { env: z.string().optional() },
		run: () => 'ok',
	});

const errorOf = (fn: () => void): Error | undefined => {
	try {
		fn();
	} catch (error) {
		return error as Error;
	}
	return undefined;
};

describe('an alias of an option', () => {
	it.each([[['-e']], [['--environment']], [['-e', '--target']], [['--dry-run']]])(
		'%j is valid',
		(alias) => {
			expect(errorOf(() => validateOptionAliases({ deploy: deployWith(alias) }, {}))).toBe(
				undefined,
			);
		},
	);

	it.each([
		[['e'], "Alias 'e' of option 'env' of command 'deploy' must be '-e'."],
		[
			['-ab'],
			"Alias '-ab' of option 'env' of command 'deploy' must be '--ab', or one character as '-a'.",
		],
		[
			['env2'],
			"Alias 'env2' of option 'env' of command 'deploy' must be '--env2', or one character as '-e'.",
		],
		[['---e'], "Alias '---e' of option 'env' of command 'deploy' must be '-e'."],
		[['-'], "Alias '-' of option 'env' of command 'deploy' must be '-x' or '--word'."],
	])('%j stops the CLI, saying how to write it', (alias, message) => {
		const error = errorOf(() => validateOptionAliases({ deploy: deployWith(alias) }, {}));

		expect(isRunaError(error, ERROR_CODES.INVALID_OPTION_ALIAS)).toBe(true);
		expect(error?.message).toBe(message);
		expect((error as { exitCode?: number }).exitCode).toBe(1);
	});

	it('is checked on a global option too', () => {
		const error = errorOf(() =>
			validateOptionAliases({}, { options: { verbose: { alias: ['V'] } } }),
		);
		expect(error?.message).toBe("Alias 'V' of option 'verbose' of the CLI must be '-V'.");
	});

	it('stops a real CLI before anything runs', async () => {
		const cli = defineCLI({
			meta: { name: 'tool', description: 'A tool' },
			commands: { deploy: deployWith(['e']) },
		});
		const result = await testCLI(cli, ['deploy']);

		expect(result.code).toBe(1);
		expect(result.result).toBeUndefined();
		expect(result.stderr).toContain("Alias 'e' of option 'env'");
	});
});
