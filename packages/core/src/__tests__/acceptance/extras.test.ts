/**
 * What comes after `--` (ADR-0036) and the errors for mistyped flags, with
 * real processes. Most cases come from the qr-plus revalidation.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const extras = (...argv: string[]) => runFixture('extras.js', argv);

function received(...argv: string[]) {
	const result = extras(...argv);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

const HELP_HINT = "Run 'extras --help' for usage.";

beforeAll(assertFreshBuild);

describe('what comes after --', () => {
	it('still fills an empty positional', () => {
		expect(received('single', '--', '-text').args.content).toBe('-text');
	});

	it.each([
		['after a positional', ['single', 'a', '--', 'b']],
		['with two values for one positional', ['single', '--', 'a', 'b']],
	])('is a usage error if it is left over, %s', (_case, argv) => {
		const { status, stderr, stdout } = extras(...argv);

		expect(status).toBe(2);
		expect(stderr).toContain("Unexpected positional argument: 'b'");
		expect(stderr.trim().endsWith(HELP_HINT)).toBe(true);
		expect(stdout).toBe('');
	});

	it('goes to a variadic, which never leaves anything over', () => {
		expect(received('many', '--', 'a', 'b').args.files).toEqual(['a', 'b']);
	});

	it('reaches ctx.rest in a command that declares it', () => {
		const { args, rest } = received('wrapper', 'ls', '--', '-la', '--color');
		expect(args.target).toBe('ls');
		expect(rest).toEqual(['-la', '--color']);
	});

	it('is an empty ctx.rest in a command that did not declare it', () => {
		expect(received('single', 'a').rest).toEqual([]);
	});
});

describe('a negated flag', () => {
	it('names the flag that was typed, not the one it negates', () => {
		const { status, stderr } = extras('single', 'a', '--no-nope');
		expect(status).toBe(2);
		expect(stderr).toContain('Unknown option: --no-nope');
		expect(stderr).not.toContain('Unknown option: --nope');
	});

	it('says a value option can not be negated', () => {
		const { status, stderr } = extras('single', 'a', '--no-style');
		expect(status).toBe(2);
		expect(stderr).toContain("Option --style can't be negated");
		expect(stderr).not.toContain('requires a value');
	});

	it('keeps working on a boolean', () => {
		expect(received('single', 'a', '--no-quiet').options.quiet).toBe(false);
	});
});

describe('a built-in flag, mistyped', () => {
	it('-V points to --version', () => {
		const { status, stderr } = extras('single', 'a', '-V');
		expect(status).toBe(2);
		expect(stderr).toContain("Unknown option: -V. Did you mean '--version'?");
	});

	it('a typo points to --version', () => {
		expect(extras('single', 'a', '--versoin').stderr).toContain("Did you mean '--version'?");
	});

	it('a typo points to --help', () => {
		expect(extras('single', 'a', '--hlep').stderr).toContain("Did you mean '--help'?");
	});

	it('a letter that matches nothing suggests nothing', () => {
		expect(extras('single', 'a', '-x').stderr).not.toContain('Did you mean');
	});
});

describe('the name of a value in help', () => {
	it('replaces the type', () => {
		expect(extras('single', '--help').stdout).toContain('--color <hex>');
	});

	it('keeps saying the option repeats', () => {
		expect(extras('single', '--help').stdout).toContain('--tint <hex>...');
	});

	it('leaves the type where it was not declared', () => {
		const { stdout } = extras('single', '--help');
		expect(stdout).toContain('--style <string>');
		expect(stdout).toContain('--mode <a|b>');
	});
});
