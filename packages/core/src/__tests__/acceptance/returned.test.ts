/**
 * What a command returns reaches the terminal (ADR-0042), through real processes.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

beforeAll(assertFreshBuild);

const run = (argv: string[], env?: Record<string, string>) => runFixture('returned.js', argv, env);

describe('without format', () => {
	it.each([
		['a string, as it is', ['text'], 'hello\n'],
		['a string that ends a line, without adding another', ['line'], 'already a line\n'],
		['an object, as JSON', ['object'], '{\n  "running": true,\n  "port": 11435\n}\n'],
		['a list, as JSON', ['list'], '[\n  1,\n  2\n]\n'],
		['zero: a value is a value', ['zero'], '0\n'],
		['an async value', ['asyncly'], '{\n  "later": true\n}\n'],
		['a value with an output schema', ['schema'], '{\n  "ok": true\n}\n'],
	])('prints %s', (_name, argv, expected) => {
		const { status, stdout, stderr } = run(argv);
		expect(status, stderr).toBe(0);
		expect(stdout).toBe(expected);
	});

	it('prints nothing for a command that returns nothing', () => {
		const { status, stdout } = run(['nothing']);
		expect(status).toBe(0);
		expect(stdout).toBe('');
	});

	it('keeps what a command prints by itself', () => {
		expect(run(['printer']).stdout).toBe('printed by hand\n');
	});

	it('shows both when a command prints and returns: that is the migration', () => {
		expect(run(['both']).stdout).toBe('printed by hand\nreturned\n');
	});

	it('prints an empty line for an empty string, which is a value', () => {
		expect(run(['empty']).stdout).toBe('\n');
	});

	it('has no --json: the value is already the data', () => {
		const { status, stderr } = run(['object', '--json']);
		expect(status).toBe(2);
		expect(stderr).toContain('--json');
	});
});

describe('with format', () => {
	it('prints what format returns', () => {
		expect(run(['status']).stdout).toBe('Proxy on, port 11435\n');
	});

	it('prints the data as JSON with --json', () => {
		const { status, stdout } = run(['status', '--json']);
		expect(status).toBe(0);
		expect(JSON.parse(stdout)).toEqual({ running: true, port: 11435 });
	});

	it('works on a nested command and with runCLI', () => {
		expect(run(['nested', 'status']).stdout).toBe('nested\n');
		expect(run([], { ROOT: '1' }).stdout).toBe('Proxy on, port 11435\n');
		expect(JSON.parse(run(['--json'], { ROOT: '1' }).stdout).port).toBe(11435);
	});

	it('lists --json in the help of that command only', () => {
		expect(run(['status', '--help']).stdout).toContain('--json');
		expect(run(['object', '--help']).stdout).not.toContain('--json');
	});

	it('fails if the command returns nothing: format promises something', () => {
		const { status, stdout, stderr } = run(['forgetful']);
		expect(status).toBe(1);
		expect(stdout).toBe('');
		expect(stderr).toContain("'forgetful'");
		expect(stderr).toContain('format');
	});

	it('fails with --json too, instead of an empty result', () => {
		expect(run(['forgetful', '--json']).status).toBe(1);
	});

	it('reports a format that throws, naming the command', () => {
		const { status, stdout, stderr } = run(['broken']);
		expect(status).toBe(1);
		expect(stdout).toBe('');
		expect(stderr).toContain('format failed');
	});

	it('does not need format to run for --json', () => {
		const { status, stdout } = run(['broken', '--json']);
		expect(status).toBe(0);
		expect(JSON.parse(stdout).running).toBe(true);
	});
});

describe('the order of a run', () => {
	it('prints the result before afterRun', () => {
		expect(run(['text'], { SHOW_ORDER: '1' }).stdout).toBe('hello\nafterRun\n');
	});

	it('validates the output first: an invalid result is not printed', () => {
		const { status, stdout, stderr } = run(['invalid']);
		expect(status).toBe(1);
		expect(stdout).toBe('');
		expect(stderr).toContain('invalid output');
	});
});

describe('a name that can not work', () => {
	it('fails at startup when a global takes --json from a command with format', () => {
		const { status, stderr } = run(['text'], { GLOBAL_JSON: '1' });
		expect(status).toBe(1);
		expect(stderr).toContain('--json');
		expect(stderr).toContain("'status'");
	});
});
