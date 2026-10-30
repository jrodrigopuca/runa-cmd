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
