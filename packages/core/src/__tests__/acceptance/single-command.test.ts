/**
 * Acceptance tests for a single-command CLI, run as a real child process.
 *
 * Nothing is mocked: process.exit, stdout, stderr and the exit code are the
 * real ones. Cases come from docs/research/2026-10-qr-plus-migration.md.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const tool = (...argv: string[]) => runFixture('tool.js', argv);

/** The values run() received; fails with stderr when the command did not run. */
function received(...argv: string[]) {
	const result = tool(...argv);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

function expectFullHelp(result: ReturnType<typeof tool>) {
	expect(result.status, result.stderr).toBe(0);
	expect(result.stdout).toContain('<content>');
	expect(result.stdout).toContain('--ecl');
	expect(result.stdout).toContain('--output');
}

beforeAll(() => {
	assertFreshBuild();
	const smoke = tool('hola');
	if (smoke.status !== 0) {
		throw new Error(`The fixture does not run:\n${smoke.stderr}`);
	}
});

describe('help (T-204)', () => {
	it('tool --help shows arguments and options', () => {
		expectFullHelp(tool('--help'));
	});

	it('tool -h shows arguments and options', () => {
		expectFullHelp(tool('-h'));
	});

	it('tool hola --help shows the same help', () => {
		expectFullHelp(tool('hola', '--help'));
	});

	it('lists --help and --version, which work on this command too', () => {
		const { stdout } = tool('--help');
		expect(stdout).toContain('-h, --help');
		expect(stdout).toContain('--version');
	});
});

describe('version', () => {
	it('tool --version prints the version', () => {
		const result = tool('--version');
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('9.9.9');
	});

	it('tool hola --version prints the version', () => {
		const result = tool('hola', '--version');
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('9.9.9');
	});
});

describe('repeated options (T-207)', () => {
	it('--tag a --tag b fills options.tag', () => {
		expect(received('hola', '--tag', 'a', '--tag', 'b').options.tag).toEqual(['a', 'b']);
	});
});

describe('option names (T-206)', () => {
	it('--dark-color fills options.darkColor', () => {
		expect(received('hola', '--dark-color', '#111').options.darkColor).toBe('#111');
	});
});

describe('single-command routing', () => {
	it('tool tool passes "tool" as content', () => {
		expect(received('tool').args.content).toBe('tool');
	});
});

describe('the -- separator', () => {
	it('tool -- -text fills the positional', () => {
		const { args, rest } = received('--', '-text');
		expect(args.content).toBe('-text');
		expect(rest).toEqual([]);
	});

	it('tool hola -- -text keeps the extra token in rest', () => {
		const { args, rest } = received('hola', '--', '-text');
		expect(args.content).toBe('hola');
		expect(rest).toEqual(['-text']);
	});
});

describe('usage errors', () => {
	it('an extra positional exits 2 and names it', () => {
		const result = tool('a', 'b');
		expect(result.status).toBe(2);
		expect(result.stderr).toContain("Unexpected positional argument: 'b'");
	});

	it('a typo exits 2 and suggests the option', () => {
		const result = tool('hola', '--outptu', 'x');
		expect(result.status).toBe(2);
		expect(result.stderr).toContain("Did you mean '--output'?");
	});

	it('a missing value exits 2 and says so', () => {
		const result = tool('hola', '-e');
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(/--ecl requires a value/);
	});

	it('an unrelated flag exits 2 without a suggestion', () => {
		const result = tool('hola', '--nope');
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Unknown option: --nope');
		expect(result.stderr).not.toContain('Did you mean');
	});

	it('a usage error points to --help', () => {
		expect(tool('hola', '--nope').stderr).toContain("Run 'tool --help' for usage.");
	});
});
