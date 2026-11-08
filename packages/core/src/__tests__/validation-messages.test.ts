/**
 * A value that breaks a rule of its schema, as .positive() or .min(), names
 * the flag and says what's wrong in plain words, as every other usage error
 * does (T-227). Before, it showed the internal key and Zod's own text:
 * `limit: Too small: expected number to be >0`.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const tool = defineCommand({
	meta: { name: 'tool', description: 'Take values with rules' },
	args: { count: z.number().min(1).optional().describe('How many') },
	options: {
		limit: z.number().positive().optional(),
		retries: z.number().min(1).max(5).optional(),
		below: z.number().lt(10).optional(),
		name: z.string().min(3).max(8).optional(),
		tag: z.array(z.string()).min(1).optional(),
		code: z
			.string()
			.regex(/^[A-Z]{3}$/)
			.optional(),
		region: z
			.string()
			.refine((value) => value !== 'mars', 'Not a region we deploy to')
			.optional(),
		color: z.string().regex(/^#/, '--color must start with #').optional(),
	},
	run: () => 'ok',
});

const firstLine = async (argv: string[]) => {
	const { code, stderr } = await testCLI(tool, argv);
	expect(code).toBe(2);
	return stderr.split('\n')[0];
};

describe('a value that breaks a rule of its schema', () => {
	it.each([
		[['--limit', '0'], "Invalid value '0' for --limit: must be greater than 0"],
		[['--retries', '0'], "Invalid value '0' for --retries: must be at least 1"],
		[['--retries', '9'], "Invalid value '9' for --retries: must be at most 5"],
		[['--below', '10'], "Invalid value '10' for --below: must be less than 10"],
		[['--name', 'ab'], "Invalid value 'ab' for --name: must have at least 3 characters"],
		[
			['--name', 'abcdefghij'],
			"Invalid value 'abcdefghij' for --name: must have at most 8 characters",
		],
		[['0'], "Invalid value '0' for <count>: must be at least 1"],
	])('%j says it in words', async (argv, message) => {
		expect(await firstLine(argv)).toBe(message);
	});

	it('names the flag for any other rule, with the message it has', async () => {
		expect(await firstLine(['--code', 'abc'])).toMatch(/^Invalid value 'abc' for --code: /);
		expect(await firstLine(['--region', 'mars'])).toBe(
			"Invalid value 'mars' for --region: Not a region we deploy to",
		);
	});

	it("keeps the author's message as written when it names the flag", async () => {
		expect(await firstLine(['--color', 'red'])).toBe('--color must start with #');
	});

	it('never shows the internal key', async () => {
		for (const argv of [
			['--limit', '0'],
			['--code', 'abc'],
			['--region', 'mars'],
		]) {
			expect(await firstLine(argv)).not.toMatch(/^(limit|code|region):/);
		}
	});
});
