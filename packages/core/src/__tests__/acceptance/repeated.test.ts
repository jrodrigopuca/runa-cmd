/**
 * Options that repeat (ADR-0035), from every source, with real processes.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const repeated = (argv: string[], env: Record<string, string> = {}) =>
	runFixture('repeated.js', argv, env);

function received(argv: string[], env: Record<string, string> = {}) {
	const result = repeated(argv, env);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

beforeAll(assertFreshBuild);

describe('at the terminal', () => {
	it('collects every value, in order', () => {
		expect(received(['tag', '--tag', 'a', '--tag', 'b']).options.tag).toEqual(['a', 'b']);
	});

	it('gives a list even with one value', () => {
		expect(received(['tag', '--tag', 'a']).options.tag).toEqual(['a']);
	});

	it('leaves an option that was not passed undefined', () => {
		expect(received(['tag']).options.tag).toBeUndefined();
	});

	it('takes the short alias and the = form', () => {
		expect(received(['tag', '-t', 'a', '--tag=b']).options.tag).toEqual(['a', 'b']);
	});

	it('adds up a long alias and the flag', () => {
		expect(received(['tag', '--tag', 'a', '--label', 'b']).options.tag).toEqual(['a', 'b']);
	});

	it('does not separate commas: at a terminal, repeating is how to say it', () => {
		expect(received(['tag', '--tag', 'a,b']).options.tag).toEqual(['a,b']);
	});

	it('works on a global option', () => {
		const { globalOptions } = received(['-I', 'a', 'tag', '--include', 'b']);
		expect(globalOptions.include).toEqual(['a', 'b']);
	});

	it('keeps an option that is not an array as it was: the last one wins', () => {
		expect(received(['tag', '--name', 'a', '--name', 'b']).options.name).toBe('b');
	});

	it('asks for a value', () => {
		const { status, stderr } = repeated(['tag', '--tag']);
		expect(status).toBe(2);
		expect(stderr).toContain('requires a value');
	});
});

describe('the type of each element', () => {
	it('converts numbers', () => {
		expect(received(['tag', '--port', '80', '--port', '81']).options.port).toEqual([80, 81]);
	});

	it('names the flag when an element is not a number', () => {
		const { status, stderr } = repeated(['tag', '--port', '80', '--port', 'x']);
		expect(status).toBe(2);
		expect(stderr).toContain('Invalid value for --port');
	});

	it('names the flag and the choices when an element is not in the enum', () => {
		const { status, stderr } = repeated(['tag', '--level', 'low', '--level', 'mid']);
		expect(status).toBe(2);
		expect(stderr).toContain('Invalid value for --level. Expected one of: low, high');
	});
});

describe('from the environment', () => {
	it('separates by commas and trims', () => {
		expect(received(['tag'], { TAGS: 'a, b ,c' }).options.tag).toEqual(['a', 'b', 'c']);
	});

	it('gives a list with one value', () => {
		expect(received(['tag'], { TAGS: 'a' }).options.tag).toEqual(['a']);
	});

	it('converts each element', () => {
		expect(received(['tag'], { PORTS: '80,81' }).options.port).toEqual([80, 81]);
	});

	it('reads an empty value as an empty list', () => {
		expect(received(['tag'], { TAGS: '' }).options.tag).toEqual([]);
	});

	it('loses to the terminal, without adding up', () => {
		expect(received(['tag', '--tag', 'x'], { TAGS: 'a,b' }).options.tag).toEqual(['x']);
	});
});

describe('from the config file', () => {
	function withConfig(config: unknown, argv: string[]) {
		const dir = mkdtempSync(join(tmpdir(), 'runa-repeated-'));
		writeFileSync(join(dir, 'repeated.config.json'), JSON.stringify(config));
		const result = repeated(argv, { CONFIG_DIR: dir });
		rmSync(dir, { recursive: true, force: true });
		return result;
	}

	it('takes a JSON array', () => {
		const { stdout, status } = withConfig({ tag: ['a', 'b,c'] }, ['tag']);
		expect(status).toBe(0);
		expect(JSON.parse(stdout).options.tag).toEqual(['a', 'b,c']);
	});

	it('does not read a string as a list: JSON already has arrays', () => {
		const { status, stderr } = withConfig({ tag: 'a,b' }, ['tag']);
		expect(status).toBe(2);
		expect(stderr).toContain('--tag');
	});
});

describe('required and default', () => {
	it('a missing required list names the flag', () => {
		const { status, stderr } = repeated(['required']);
		expect(status).toBe(2);
		expect(stderr).toContain('Missing required option: --tag');
	});

	it('the default is replaced, not added to', () => {
		expect(received(['defaults']).options.tag).toEqual(['base']);
		expect(received(['defaults', '--tag', 'x']).options.tag).toEqual(['x']);
	});
});

describe('help', () => {
	it('says it repeats, and of what', () => {
		const { stdout } = repeated(['tag', '--help']);
		expect(stdout).toContain('--tag <string>...');
		expect(stdout).toContain('--port <number>...');
		expect(stdout).toContain('--level <low|high>...');
		expect(stdout).toMatch(/--name <string>$/m);
	});
});
