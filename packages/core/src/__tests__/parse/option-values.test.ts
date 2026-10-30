/**
 * Unit tests for missing option values (parse/strict.ts), over real parseArgs
 * tokens: the behavior depends on how parseArgs reads each form.
 */
import { parseArgs } from 'node:util';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../errors.js';
import { assertOptionValues } from '../../parse/strict.js';

const options = {
	label: { type: 'string', short: 'l' },
	tag: { type: 'string' },
	force: { type: 'boolean', short: 'f' },
} as const;

function check(args: string[]) {
	const { tokens } = parseArgs({
		options,
		args,
		strict: false,
		allowPositionals: true,
		allowNegative: true,
		tokens: true,
	});
	assertOptionValues({
		tokens,
		options,
		longAliasMap: { tag: 'label' },
		optionMeta: { label: { alias: ['-l', '--tag'] } },
	});
}

describe('assertOptionValues', () => {
	it.each([
		['no token after it', ['--label']],
		['a short flag', ['-l']],
		['a long flag after it', ['--label', '--force']],
		['a short flag after it', ['--label', '-f']],
		['a negated boolean after it', ['--label', '--no-force']],
		['a long alias', ['--tag']],
	])('rejects %s', (_case, args) => {
		expect(() => check(args)).toThrow(ValidationError);
		expect(() => check(args)).toThrow('Option -l, --tag, --label requires a value');
	});

	it.each([
		['a plain value', ['--label', 'x']],
		['an inline value', ['--label=x']],
		['an inline value equal to a flag', ['--label=--force']],
		['an unknown dash value', ['--label', '-text']],
		['a negative number', ['--label', '-1']],
		['a boolean without a value', ['--force']],
		['an unknown flag, left to the strict check', ['--nope']],
	])('accepts %s', (_case, args) => {
		expect(() => check(args)).not.toThrow();
	});

	it('accepts a result without tokens', () => {
		expect(() =>
			assertOptionValues({ tokens: undefined, options, longAliasMap: {} }),
		).not.toThrow();
	});
});
