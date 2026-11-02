/**
 * A command is written one way everywhere (ADR-0043), through real processes.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

beforeAll(assertFreshBuild);

const names = (argv: string[], env?: Record<string, string>) =>
	runFixture('command-names.js', argv, env);

describe('the key is the name', () => {
	it('runs the command as it is written', () => {
		const { status, stdout, stderr } = names(['with-output']);
		expect(status, stderr).toBe(0);
		expect(stdout).toBe('with-output\n');
	});

	it('does not need meta.name, and run() still gets the name', () => {
		expect(JSON.parse(names(['no-name']).stdout).name).toBe('no-name');
	});

	it('takes numbers, and nests in a group', () => {
		expect(names(['build2']).status).toBe(0);
		expect(JSON.parse(names(['tools', 'add-tag']).stdout).name).toBe('add-tag');
	});

	it('shows that name in the help', () => {
		const { stdout } = names(['--help']);
		expect(stdout).toContain('with-output');
		expect(stdout).toContain('no-name');
	});

	it('uses that name in the config file', () => {
		const dir = mkdtempSync(join(tmpdir(), 'runa-command-names-'));
		const config = { 'no-name': { level: 'high' } };
		writeFileSync(join(dir, 'names.config.json'), JSON.stringify(config));

		const result = names(['no-name'], { CONFIG_DIR: dir });
		rmSync(dir, { recursive: true, force: true });

		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout).options.level).toBe('high');
	});

	it('does not accept another form: a typo gets the right one', () => {
		const { status, stderr } = names(['withOutput']);
		expect(status).toBe(127);
		expect(stderr).toContain("'with-output'");
	});
});

describe('a key that can not be a name', () => {
	it.each([
		['camelCase', 'camel', "'withOutput'", "'with-output'"],
		['snake_case', 'snake', "'with_output'", "'with-output'"],
		['an uppercase letter', 'upper', "'Build'", "'build'"],
		['a group in camelCase', 'group', "'myGroup'", "'my-group'"],
		['a nested command in camelCase', 'nested', "'withOutput'", "'with-output'"],
	])('fails at startup with %s, and gives the right form', (_name, broken, key, proposal) => {
		const { status, stderr, stdout } = names(['--help'], { BROKEN: broken });
		expect(status).toBe(1);
		expect(stdout).toBe('');
		expect(stderr).toContain(key);
		expect(stderr).toContain(proposal);
		expect(stderr).not.toContain('Unexpected error');
	});

	it('rejects other symbols too', () => {
		const { status, stderr } = names(['--help'], { BROKEN: 'dot' });
		expect(status).toBe(1);
		expect(stderr).toContain("'with.dot'");
	});
});

describe('meta.name', () => {
	it('fails at startup if it says something else', () => {
		const { status, stderr } = names(['--help'], { BROKEN: 'mismatch' });
		expect(status).toBe(1);
		expect(stderr).toContain("'something-else'");
		expect(stderr).toContain("'actual'");
	});
});

describe('with runCLI', () => {
	it('uses meta.name as the name of the CLI', () => {
		expect(names(['--help'], { ROOT: 'named' }).stdout).toContain('with-output');
	});

	it('requires it: there is no key to name the CLI', () => {
		const { status, stderr } = names([], { ROOT: 'nameless' });
		expect(status).toBe(1);
		expect(stderr).toContain('meta.name');
		expect(stderr).not.toContain('Unexpected error');
	});
});
