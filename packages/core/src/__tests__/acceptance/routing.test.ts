/**
 * Acceptance tests for --version, the -- separator and the root mode of
 * runCLI, as real child processes (ADR-0021, ADR-0022, ADR-0023).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const VERSIONED = { CLI_VERSION: '3.1.4' };

const routing = (argv: string[], env?: Record<string, string>) =>
	runFixture('routing.js', argv, env);
const rooted = (...argv: string[]) => runFixture('rooted.js', argv);

function received(argv: string[], env?: Record<string, string>) {
	const result = routing(argv, env);
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout);
}

beforeAll(assertFreshBuild);

describe('--version', () => {
	it.each([
		['before any command', ['--version']],
		['after a command', ['status', '--version']],
	])('prints the version %s', (_case, argv) => {
		const result = routing(argv, VERSIONED);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('3.1.4');
	});

	it('does not exist without a declared version', () => {
		const result = routing(['status', '--version']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Unknown option: --version');
	});

	it('gives way to an option the command declares', () => {
		const { options } = received(['deploy', '--version', '1.2.3'], VERSIONED);
		expect(options.version).toBe('1.2.3');
	});

	it('gives way to a long alias the command declares', () => {
		const { options } = received(['release', '--version', 'v9'], VERSIONED);
		expect(options.tag).toBe('v9');
	});

	it('still prints on the other commands of that CLI', () => {
		expect(routing(['status', '--version'], VERSIONED).stdout.trim()).toBe('3.1.4');
	});

	it('is plain data after --', () => {
		const { rest } = received(['run', '--', '--version'], VERSIONED);
		expect(rest).toEqual(['--version']);
	});

	it('has no short alias', () => {
		expect(routing(['status', '-V'], VERSIONED).status).toBe(2);
	});
});

describe('the -- separator', () => {
	it('fills a required positional', () => {
		const { args, rest } = received(['copy', '--', '-a', '-b']);
		expect(args).toEqual({ from: '-a', to: '-b' });
		expect(rest).toEqual([]);
	});

	it('fills what is left after the positionals before --', () => {
		const { args, rest } = received(['copy', 'a', '--', '-b']);
		expect(args).toEqual({ from: 'a', to: '-b' });
		expect(rest).toEqual([]);
	});

	it('sends what does not fit to rest', () => {
		const { args, rest } = received(['copy', 'a', 'b', '--', '-c']);
		expect(args).toEqual({ from: 'a', to: 'b' });
		expect(rest).toEqual(['-c']);
	});

	it('fills an optional positional too, as POSIX operands', () => {
		const { args, rest } = received(['exec', '--', 'ls', '-la']);
		expect(args.target).toBe('ls');
		expect(rest).toEqual(['-la']);
	});

	it('fills an empty variadic with everything', () => {
		const { args, rest } = received(['add', '--', '-a', '-b']);
		expect(args.files).toEqual(['-a', '-b']);
		expect(rest).toEqual([]);
	});

	it('leaves a filled variadic alone: lint a.ts -- --fix', () => {
		const { args, rest } = received(['add', 'a.ts', '--', '--fix']);
		expect(args.files).toEqual(['a.ts']);
		expect(rest).toEqual(['--fix']);
	});

	it('leaves everything in rest when the command has no positionals', () => {
		const { rest } = received(['run', '--', 'npm', 'test']);
		expect(rest).toEqual(['npm', 'test']);
	});

	it('still reports a missing positional', () => {
		const result = routing(['copy', '--', '-a']);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('Missing required argument: <to>');
	});
});

describe('runCLI with a plugin that adds a subcommand', () => {
	it('runs the root command, and the plugin works', () => {
		const { stdout } = rooted('hola');
		expect(stdout).toContain('plugin hook ran');
		expect(stdout).toContain('content: hola');
	});

	it('treats the command name as data', () => {
		expect(rooted('tool').stdout).toContain('content: tool');
	});

	it('runs the subcommand when its name comes first', () => {
		expect(rooted('sync').stdout).toContain('ran sync');
	});

	it('passes a subcommand name as data after --', () => {
		expect(rooted('--', 'sync').stdout).toContain('content: sync');
	});

	it('keeps the version of the command', () => {
		expect(rooted('--version').stdout.trim()).toBe('2.0.0');
	});
});

describe('defineCLI with a single command', () => {
	const implicit = (...argv: string[]) => runFixture('implicit.js', argv);

	it('keeps working, and warns once that the mode is deprecated', () => {
		const { status, stdout, stderr } = implicit('hola');
		expect(status, stderr).toBe(0);
		expect(stdout).toContain('content: hola');
		expect(stderr.match(/DeprecationWarning/g)).toHaveLength(1);
		expect(stderr).toContain('Use runCLI()');
	});

	it('does not warn when the command is named, which is regular routing', () => {
		expect(implicit('tool', 'hola').stderr).toBe('');
	});
});
