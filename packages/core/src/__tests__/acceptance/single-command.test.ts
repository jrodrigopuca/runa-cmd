/**
 * Acceptance tests for a single-command CLI, run as a real child process.
 *
 * Nothing is mocked: process.exit, stdout, stderr and the exit code are the
 * real ones. Cases come from docs/research/2026-10-qr-plus-migration.md.
 *
 * `pending` marks behavior a backlog task has not delivered yet. It passes
 * while the behavior is missing and FAILS once it works: the task that fixes
 * it must then replace `pending` with `it`. To see the real failure of every
 * pending case, run with RUNA_SHOW_PENDING=1.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, 'fixtures', 'tool.js');
const srcDir = join(here, '..', '..');
const builtEntry = join(srcDir, '..', 'dist', 'index.js');

const pending = process.env.RUNA_SHOW_PENDING ? it : it.fails;

function tool(...argv: string[]) {
	const { status, stdout, stderr } = spawnSync(process.execPath, [fixture, ...argv], {
		encoding: 'utf8',
		env: { ...process.env, NO_COLOR: '1' },
	});
	return { status, stdout, stderr };
}

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

/** Newest modification time among non-test sources. */
function newestSource(dir: string): number {
	return Math.max(
		...readdirSync(dir, { withFileTypes: true }).map((entry) => {
			const path = join(dir, entry.name);
			if (entry.name === '__tests__') return 0;
			return entry.isDirectory() ? newestSource(path) : statSync(path).mtimeMs;
		}),
	);
}

// `pending` also "passes" when the fixture cannot start, so a broken or stale
// build must stop the suite instead of hiding behind expected failures.
beforeAll(() => {
	const built = statSync(builtEntry, { throwIfNoEntry: false });
	if (!built || built.mtimeMs < newestSource(srcDir)) {
		throw new Error('Acceptance tests run against dist/, which is missing or stale: pnpm build');
	}
	const smoke = tool('hola');
	if (smoke.status !== 0) {
		throw new Error(`The fixture does not run:\n${smoke.stderr}`);
	}
});

describe('help (T-204)', () => {
	pending('tool --help shows arguments and options', () => {
		expectFullHelp(tool('--help'));
	});

	pending('tool -h shows arguments and options', () => {
		expectFullHelp(tool('-h'));
	});

	pending('tool hola --help shows the same help', () => {
		expectFullHelp(tool('hola', '--help'));
	});
});

describe('version (T-201)', () => {
	pending('tool --version prints the version', () => {
		const result = tool('--version');
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('9.9.9');
	});

	pending('tool hola --version prints the version', () => {
		const result = tool('hola', '--version');
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('9.9.9');
	});
});

describe('option names (T-206)', () => {
	pending('--dark-color fills options.darkColor', () => {
		expect(received('hola', '--dark-color', '#111').options.darkColor).toBe('#111');
	});
});

describe('single-command routing (T-203)', () => {
	pending('tool tool passes "tool" as content', () => {
		expect(received('tool').args.content).toBe('tool');
	});
});

describe('the -- separator', () => {
	pending('tool -- -text fills the positional (T-202)', () => {
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

	pending('a missing value exits 2 and says so (T-104)', () => {
		const result = tool('hola', '-e');
		expect(result.status).toBe(2);
		expect(result.stderr).toMatch(/--ecl requires a value/);
	});

	pending('an unrelated flag exits 2 without a suggestion (T-105)', () => {
		const result = tool('hola', '--nope');
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Unknown option: --nope');
		expect(result.stderr).not.toContain('Did you mean');
	});
});
