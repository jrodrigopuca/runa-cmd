/**
 * camelCase in code, kebab-case at the terminal (ADR-0024), with real processes.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const names = (argv: string[], env: Record<string, string> = {}) =>
	runFixture('names.js', argv, env);

function received(...argv: string[]) {
	const result = names(['paint', ...argv]);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

beforeAll(assertFreshBuild);

describe('flags', () => {
	it('--dark-color fills options.darkColor', () => {
		expect(received('--dark-color', '#111').options.darkColor).toBe('#111');
	});

	it('--dark-color=#111 works too', () => {
		expect(received('--dark-color=#111').options.darkColor).toBe('#111');
	});

	it('keeps a short alias', () => {
		expect(received('-d', '#111').options.darkColor).toBe('#111');
	});

	it('splits an acronym as one word', () => {
		expect(received('--output-url', 'x').options.outputURL).toBe('x');
	});

	it('--no-dark-mode negates darkMode', () => {
		expect(received('--no-dark-mode').options.darkMode).toBe(false);
	});

	it('leaves a key that already has hyphens', () => {
		expect(received('--already-kebab', 'x').options['already-kebab']).toBe('x');
	});

	it('works on global options, wherever they go', () => {
		expect(received('--log-level', 'debug').globalOptions.logLevel).toBe('debug');
		const before = names(['--log-level', 'debug', '--no-color-output', 'paint']);
		expect(JSON.parse(before.stdout).globalOptions).toEqual({
			logLevel: 'debug',
			colorOutput: false,
		});
	});

	it('coerces a number', () => {
		expect(received('--retry-count', '3').options.retryCount).toBe(3);
	});
});

describe('the camelCase form', () => {
	it.each([
		['--darkColor', '--dark-color'],
		['--outputURL', '--output-url'],
		['--retryCount', '--retry-count'],
	])('%s fails with 2 and points to %s', (wrong, right) => {
		const result = names(['paint', wrong, 'x']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain(`Unknown option: ${wrong}. Did you mean '${right}'?`);
	});

	it('points to a global option too', () => {
		const { stderr, status } = names(['paint', '--logLevel', 'x']);
		expect(status).toBe(2);
		expect(stderr).toContain("Did you mean '--log-level'?");
	});
});

describe('every message names the flag', () => {
	it('a missing option', () => {
		const { stderr } = names(['strict']);
		expect(stderr).toContain('Missing required option: --api-token');
		expect(stderr).not.toContain('apiToken');
	});

	it('an invalid value', () => {
		expect(names(['paint', '--retry-count', 'x']).stderr).toContain(
			'Invalid value for --retry-count',
		);
	});

	it('a value that is missing', () => {
		expect(names(['paint', '--dark-color']).stderr).toContain(
			'Option -d, --dark-color requires a value',
		);
	});

	it('a deprecated option', () => {
		expect(names(['paint', '--old-name', 'x']).stderr).toContain(
			'Warning: --old-name is deprecated.',
		);
	});

	it('the help', () => {
		const { stdout } = names(['paint', '--help']);
		expect(stdout).toContain('-d, --dark-color <string>');
		expect(stdout).toContain('--output-url');
		expect(stdout).toContain('--log-level');
		expect(stdout).not.toContain('darkColor');
	});
});

describe('other sources keep the key', () => {
	it('env fills it as declared', () => {
		const result = names(['paint'], { FROM_ENV: 'x' });
		expect(JSON.parse(result.stdout).options.fromEnv).toBe('x');
	});

	it('the config file uses the camelCase key', () => {
		const dir = mkdtempSync(join(tmpdir(), 'runa-names-'));
		writeFileSync(join(dir, 'names.config.json'), JSON.stringify({ darkColor: '#222' }));

		const result = names(['paint'], { CONFIG_DIR: dir });
		rmSync(dir, { recursive: true, force: true });

		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout).options.darkColor).toBe('#222');
	});
});

describe('names that can not work', () => {
	it.each([
		['a boolean noCache', 'negation', "'noCache'", "'cache'"],
		['a boolean no-cache', 'hyphen-negation', "'no-cache'", "'cache'"],
		['a global boolean noColor', 'global-negation', "'noColor'", "'color'"],
	])('%s fails at startup and proposes the positive name', (_case, broken, key, proposal) => {
		const { status, stderr } = names(['paint'], { BROKEN: broken });
		expect(status).toBe(1);
		expect(stderr).toContain(key);
		expect(stderr).toContain(proposal);
	});

	it('two keys for the same flag fail at startup', () => {
		const { status, stderr } = names(['paint'], { BROKEN: 'same-flag' });
		expect(status).toBe(1);
		expect(stderr).toContain("'darkColor' and 'dark-color'");
		expect(stderr).toContain('--dark-color');
	});
});
