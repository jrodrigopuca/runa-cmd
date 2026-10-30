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
		JSON.stringify({ minify: true, cache: false, watch: true }),
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
		expect(result.stderr).toContain('expected boolean');
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
