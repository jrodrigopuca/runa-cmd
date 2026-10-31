/**
 * The published entry point, and RUNA_DEBUG=1, through real processes.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

beforeAll(assertFreshBuild);

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'testing.test.js');

describe('@runa-cmd/core/testing under node --test', () => {
	it('keeps the report of the runner, with every result in it', () => {
		const { stdout } = spawnSync(process.execPath, ['--test', fixture], { encoding: 'utf8' });

		expect(stdout).toMatch(/tests 22/);
		expect(stdout).toMatch(/pass 21/);
		expect(stdout).toMatch(/fail 1/);
		expect(stdout).toContain('fails on purpose');
	});
});

describe('RUNA_DEBUG=1', () => {
	const notes = (argv: string[], env: Record<string, string> = {}) =>
		runFixture('config-file.js', argv, { RUNA_DEBUG: '1', ...env });

	it('shows the steps of the run on stderr', () => {
		const { status, stdout, stderr } = notes(['add', '--priority', 'high']);

		expect(status).toBe(0);
		expect(JSON.parse(stdout).options.priority).toBe('high');
		expect(stderr).toContain('option priority (cli)');
		expect(stderr).toContain('option store (default)');
		expect(stderr).toMatch(/run add \d+ms/);
	});

	it('never prints a value, whatever its source', () => {
		const { stderr } = notes(['add', '--priority', 'typed-secret'], {
			NOTES_STORE: 'env-secret',
		});

		expect(stderr).toContain('option store (env)');
		expect(stderr).not.toContain('typed-secret');
		expect(stderr).not.toContain('env-secret');
	});

	it('stays silent without it', () => {
		const { stderr } = runFixture('config-file.js', ['add']);
		expect(stderr).toBe('');
	});
});
