/**
 * A wrong config file says the same thing in every case: which file, which
 * key, and what's wrong, with the words the terminal uses (T-235).
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { ERROR_CODES, isRunaError } from '../errors.js';
import { testCLI } from '../testing.js';

const clear = defineCommand({
	meta: { description: 'Clear the cache' },
	options: {
		force: z.boolean().default(false),
		limit: z.number().int().positive().default(5),
		level: z.enum(['low', 'high']).default('low'),
		name: z.string().min(3).optional(),
	},
	run: ({ options }) => options,
});

const cli = defineCLI({
	meta: { name: 'tool', version: '1.0.0', description: 'Test' },
	config: { name: 'tool' },
	commands: { clear },
});

const withConfig = (config: Record<string, unknown>) => testCLI(cli, ['clear'], { config });

describe('a value in the config file that breaks its schema', () => {
	it.each([
		[{ limit: 0 }, "testCLI config: invalid value for 'clear.limit': must be greater than 0"],
		[
			{ name: 'ab' },
			"testCLI config: invalid value for 'clear.name': must have at least 3 characters",
		],
		[
			{ level: 'mid' },
			"testCLI config: invalid value for 'clear.level': expected one of: low, high",
		],
		[{ limit: 'many' }, "testCLI config: invalid value for 'clear.limit': expected number"],
		[{ force: 1 }, "testCLI config: invalid value for 'clear.force': expected true or false"],
		[{ force: 'yes' }, "testCLI config: invalid value for 'clear.force': expected true or false"],
	])('%j says it with the words of the terminal', async (values, message) => {
		const result = await withConfig({ clear: values });

		expect(result.code).toBe(2);
		expect(result.stderr.split('\n')[0]).toBe(message);
		expect(isRunaError(result.error, ERROR_CODES.VALIDATION_ERROR)).toBe(true);
	});
});

describe('a value in the config file can be its JSON type, or the text the terminal takes', () => {
	it.each([
		[
			{ force: true, limit: 7 },
			{ force: true, limit: 7 },
		],
		[
			{ force: 'true', limit: '7' },
			{ force: true, limit: 7 },
		],
		[{ force: '0' }, { force: false, limit: 5 }],
	])('%j', async (values, expected) => {
		const result = await withConfig({ clear: values });

		expect(result.code).toBe(0);
		expect(result.result).toMatchObject(expected);
	});
});

describe('a config file that is not well made', () => {
	it('an unknown key names the file and the key, with the same format', async () => {
		const result = await withConfig({ clear: { limt: 3 } });

		expect(result.code).toBe(2);
		expect(result.stderr.split('\n')[0]).toBe(
			"testCLI config: unknown key 'clear.limt'. Did you mean 'limit'?",
		);
		expect(isRunaError(result.error, ERROR_CODES.INVALID_CONFIG)).toBe(true);
	});
});
