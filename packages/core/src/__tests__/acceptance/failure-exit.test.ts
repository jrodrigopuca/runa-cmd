/**
 * Acceptance tests for how a CLI ends when something fails, as a real child
 * process: resources are released and the reason is always visible.
 * These cases cannot be mocked: a mocked process.exit hid the missing cleanup.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const app = (argv: string[], env?: Record<string, string>) => runFixture('failing.js', argv, env);

const DEBUG_HINT = 'Run with RUNA_DEBUG=1 for details.';

beforeAll(assertFreshBuild);

describe('cleanup', () => {
	it.each([
		['an unexpected error', ['plain']],
		['a typed error', ['expected']],
		['a usage error', ['strict', '--nope']],
		['an unknown command', ['missing']],
	])('awaits the hook and plugin cleanup after %s', (_case, argv) => {
		expect(app(argv).stdout.trim().split('\n')).toEqual(['cleanup-hook', 'plugin-cleanup']);
	});

	it('awaits cleanup when a plugin fails during setup', () => {
		expect(app(['plain'], { PLUGIN_CRASHES: '1' }).stdout).toContain('plugin-cleanup');
	});
});

describe('the reason for exiting', () => {
	it('shows a typed error as written, with its exit code', () => {
		const result = app(['expected']);
		expect(result.status).toBe(3);
		expect(result.stderr.trim()).toBe('Environment is locked');
	});

	it('shows a usage error with exit 2', () => {
		const result = app(['strict', '--nope']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Unknown option: --nope');
	});

	it('names the command in an unexpected error and points to the details', () => {
		const result = app(['plain']);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Unexpected error in 'plain': kaboom");
		expect(result.stderr).toContain(DEBUG_HINT);
	});

	it('uses the thrown text when something other than an Error is thrown', () => {
		const result = app(['text']);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Unexpected error in 'text': just text");
	});

	it.each([
		['an empty Error', 'empty', 1, 'Error'],
		['a typed error without a message', 'empty-expected', 3, 'CommandError'],
		['throw undefined', 'nothing', 1, 'Error'],
	])('never exits silently on %s', (_case, command, status, type) => {
		const result = app([command]);
		expect(result.status).toBe(status);
		expect(result.stderr).toContain(`'${command}' failed without an error message (${type})`);
		expect(result.stderr).toContain(DEBUG_HINT);
	});

	it('uses the CLI name when the failure comes before the command', () => {
		const result = app(['plain'], { PLUGIN_CRASHES: '1' });
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Unexpected error in 'app': plugin exploded");
	});
});

describe('RUNA_DEBUG', () => {
	it('stays off by default: no stack traces for people using the CLI', () => {
		expect(app(['plain']).stderr).not.toMatch(/^\s+at /m);
	});

	it('adds the stack of an unexpected error', () => {
		const { stderr } = app(['plain'], { RUNA_DEBUG: '1' });
		expect(stderr).toContain("Unexpected error in 'plain': kaboom");
		expect(stderr).toMatch(/^\s+at /m);
		expect(stderr).not.toContain(DEBUG_HINT);
	});

	it('adds the error code of a typed error', () => {
		const { stderr } = app(['expected'], { RUNA_DEBUG: '1' });
		expect(stderr).toContain('Environment is locked');
		expect(stderr).toContain('Code: ENV_LOCKED');
	});

	it('adds the cause', () => {
		expect(app(['caused'], { RUNA_DEBUG: '1' }).stderr).toContain('disk full');
	});

	it('treats 0 as off', () => {
		expect(app(['plain'], { RUNA_DEBUG: '0' }).stderr).not.toMatch(/^\s+at /m);
	});
});

describe('usage errors', () => {
	it('an extra positional on a command without args exits 2', () => {
		const result = app(['strict', 'extra']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain("Unexpected positional argument: 'extra'");
		expect(result.stderr).not.toContain('Unexpected error');
	});

	it.each([
		['a string option', ['strict', '--label'], 'Option -l, --tag, --label requires a value'],
		['its short alias', ['strict', '-l'], 'Option -l, --tag, --label requires a value'],
		['its long alias', ['strict', '--tag'], 'Option -l, --tag, --label requires a value'],
		['a number option', ['strict', '--port'], 'Option --port requires a value'],
		['an enum option', ['strict', '--level'], 'Option --level requires a value'],
		['a global option', ['strict', '--profile'], 'Option --profile requires a value'],
	])('a missing value on %s says so', (_case, argv, message) => {
		const result = app(argv);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain(message);
		expect(result.stderr).not.toContain('Invalid value');
	});

	it.each([
		['a long flag', ['strict', '--label', '--port', '3']],
		['a short flag', ['strict', '--label', '-l']],
		['a long alias', ['strict', '--label', '--tag']],
	])('does not swallow %s as a value', (_case, argv) => {
		const result = app(argv);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('--label requires a value');
	});

	it('does not swallow a negated boolean as a value', () => {
		const result = app(['legacy', '--port', '--no-force']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('--port requires a value');
	});

	it.each([
		['text starting with a dash', ['strict', '--label', '-text']],
		['a negative number', ['strict', '--port', '-1']],
		['an explicit value equal to a flag', ['strict', '--label=--port']],
	])('accepts %s', (_case, argv) => {
		const result = app(argv);
		expect(result.status, result.stderr).toBe(0);
	});

	it('names a missing argument once, without the description', () => {
		expect(app(['required', '--token', 'x']).stderr.trim().split('\n')[0]).toBe(
			'Missing required argument: <target>',
		);
	});

	it('names a missing option once, without the description', () => {
		expect(app(['required', 'home']).stderr.trim().split('\n')[0]).toBe(
			'Missing required option: --token',
		);
	});
});

describe('the next step after a usage error', () => {
	const HELP_HINT = "Run 'app --help' for usage.";

	it.each([
		['an unknown option', ['strict', '--nope']],
		['an unknown command', ['missing']],
		['a missing argument', ['required', '--token', 'x']],
	])('points to --help after %s', (_case, argv) => {
		expect(app(argv).stderr.trim().endsWith(HELP_HINT)).toBe(true);
	});

	it('does not point to --help when the command itself failed', () => {
		expect(app(['expected']).stderr).not.toContain('--help');
	});
});

describe('invalid output', () => {
	it('names the command and the field, without dumping Zod JSON', () => {
		const result = app(['bad-output']);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Command 'bad-output' returned invalid output");
		expect(result.stderr).toContain('url:');
		expect(result.stderr).not.toContain('"code"');
	});
});

describe('deprecated options', () => {
	const WARNING = 'Warning: --force is deprecated. Use --confirm instead';

	it('warns on stderr and still runs the command', () => {
		const result = app(['legacy', '--force']);
		expect(result.status).toBe(0);
		expect(result.stderr).toContain(WARNING);
		expect(result.stdout).toContain('"force":true');
		expect(result.stdout).not.toContain('deprecated');
	});

	it('warns when the option arrives through an alias', () => {
		expect(app(['legacy', '--yes']).stderr).toContain(WARNING);
	});

	it('warns when the option arrives from the environment', () => {
		expect(app(['legacy'], { LEGACY_FORCE: 'true' }).stderr).toContain(WARNING);
	});

	it('warns when negated, because the option was still used', () => {
		expect(app(['legacy', '--no-force']).stderr).toContain(WARNING);
	});

	it('stays quiet when the option is not used', () => {
		expect(app(['legacy', '--confirm']).stderr).toBe('');
	});

	it('warns once per deprecated option', () => {
		const { stderr } = app(['legacy', '--force', '--port', '1']);
		expect(stderr.match(/Warning:/g)).toHaveLength(2);
	});

	it('does not warn when the command never starts', () => {
		expect(app(['legacy', '--force', '--nope']).stderr).not.toContain('Warning');
	});
});

describe('errors handled by a plugin', () => {
	it('keeps a failing exit code and leaves the output to the plugin', () => {
		const result = app(['expected'], { PLUGIN_HANDLES: '1' });
		expect(result.status).toBe(3);
		expect(result.stderr.trim()).toBe('plugin says: it broke');
		expect(result.stdout).toContain('plugin-cleanup');
	});

	it('exits 1 when the handled error has no exit code', () => {
		expect(app(['plain'], { PLUGIN_HANDLES: '1' }).status).toBe(1);
	});

	it('exits 0 only when the plugin says it recovered', () => {
		expect(app(['plain'], { PLUGIN_RECOVERS: '1' }).status).toBe(0);
	});
});
