/**
 * Acceptance tests for booleans across every source, as a real child process:
 * the documented order is CLI > env > config > default (ADR-0008).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

let configDir: string;

const show = (argv: string[] = [], env?: Record<string, string>) =>
	runFixture('values.js', ['show', ...argv], env);

function resolved(argv: string[] = [], env?: Record<string, string>) {
	const result = show(argv, env);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

beforeAll(() => {
	assertFreshBuild();
	configDir = mkdtempSync(join(tmpdir(), 'runa-values-'));
	writeFileSync(
		join(configDir, 'values.config.json'),
		JSON.stringify({ show: { minify: true, cache: false, watch: true } }),
	);
});

afterAll(() => {
	rmSync(configDir, { recursive: true, force: true });
});

describe('defaults', () => {
	it('uses the schema defaults when no source sets a value', () => {
		expect(resolved()).toEqual({ minify: false, cache: true });
	});
});

describe('environment variables', () => {
	it.each([
		['true', true],
		['1', true],
		['TRUE', true],
		['false', false],
		['0', false],
		['FALSE', false],
	])('MINIFY=%s on a boolean with a default gives %s', (value, expected) => {
		expect(resolved([], { MINIFY: value }).minify).toBe(expected);
	});

	it('turns off a boolean whose default is true', () => {
		expect(resolved([], { CACHE: 'false' }).cache).toBe(false);
	});

	it.each([
		['true', true],
		['1', true],
		['false', false],
		['0', false],
	])('WATCH=%s on an optional boolean gives %s', (value, expected) => {
		expect(resolved([], { WATCH: value }).watch).toBe(expected);
	});

	it.each(['quizas', '', '2'])('rejects MINIFY=%j, naming the option', (value) => {
		const result = show([], { MINIFY: value });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('--minify');
		expect(result.stderr).toContain('expected true or false');
	});
});

describe('config files', () => {
	it('applies booleans from the config file', () => {
		expect(resolved([], { CONFIG_DIR: configDir })).toEqual({
			minify: true,
			cache: false,
			watch: true,
		});
	});
});

describe('priority', () => {
	it('--no-minify wins over env', () => {
		expect(resolved(['--no-minify'], { MINIFY: 'true' }).minify).toBe(false);
	});

	it('--cache wins over env', () => {
		expect(resolved(['--cache'], { CACHE: 'false' }).cache).toBe(true);
	});

	it('env wins over config', () => {
		expect(resolved([], { MINIFY: 'false', CONFIG_DIR: configDir }).minify).toBe(false);
	});

	it('--no-minify wins over config', () => {
		expect(resolved(['--no-minify'], { CONFIG_DIR: configDir }).minify).toBe(false);
	});
});

describe('values written on the command line', () => {
	it.each([
		['--minify=true', true],
		['--minify=false', false],
		['--minify=1', true],
		['--minify=0', false],
	])('%s gives %s', (flag, expected) => {
		expect(resolved([flag]).minify).toBe(expected);
	});

	it('rejects --minify=quizas', () => {
		const result = show(['--minify=quizas']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('--minify');
	});
});

// T-266: a negation takes no value. Before, the value was dropped and the
// option kept its default with exit 0, so --no-cache=true left cache on.
describe('a value after a negated boolean', () => {
	it.each([
		['--no-cache=true'],
		['--no-cache=false'],
		['--no-cache=1'],
		['--no-cache=0'],
		['--no-cache='],
		['--no-cache=banana'],
	])('rejects %s with exit 2, naming the flag', (flag) => {
		const result = show([flag]);
		expect(result.status).toBe(2);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('Option --no-cache does not take a value');
		expect(result.stderr).toContain('for usage.');
	});

	it('names the flag as typed, for a long alias', () => {
		const result = show(['--no-compress=true']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Option --no-compress does not take a value');
	});

	it('rejects it on a global option too', () => {
		const result = show(['--no-quiet=true']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Option --no-quiet does not take a value');
	});

	it('still negates without a value, on a command and a global option', () => {
		expect(resolved(['--no-cache']).cache).toBe(false);
		expect(resolved(['--no-compress']).minify).toBe(false);
		expect(show(['--no-quiet']).status).toBe(0);
	});

	it('leaves a negated option that is not a boolean as unknown', () => {
		const result = show(['--no-nope=1']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Unknown option: --no-nope');
	});
});
