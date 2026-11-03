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

describe('the usage of a command', () => {
	it('starts with the name of the CLI, so it can be copied', () => {
		expect(routing(['status', '--help']).stdout).toContain('routing status [options]');
	});

	it('shows the whole path of a nested command', () => {
		expect(routing(['group', 'inner', '--help']).stdout).toContain('routing group inner [options]');
	});

	it('names the CLI once with runCLI: the command is the CLI', () => {
		const { stdout } = rooted('--help');
		expect(stdout).toContain('\n  tool <content> [options]\n');
	});

	it('adds the CLI to a command of a plugin, which is not the root', () => {
		expect(rooted('sync', '--help').stdout).toContain('tool sync [options]');
	});

	it('marks a variadic with dots', () => {
		expect(routing(['add', '--help']).stdout).toContain('routing add <files...>');
	});

	it('titles the help the same way', () => {
		const { stdout } = routing(['group', 'inner', '--help']);
		expect(stdout.split('\n')[0]).toBe('routing group inner');
	});
});

describe('a flag where a command should be', () => {
	it.each([
		['an unknown long flag', ['--bogus'], '--bogus'],
		['one with a value', ['--bogus=1'], '--bogus'],
		['a short flag', ['-x'], '-x'],
		['one before a command', ['--bogus', 'status'], '--bogus'],
		['one inside a group', ['group', '--bogus'], '--bogus'],
	])('reports %s as a usage error, not as a command', (_case, argv, flag) => {
		const { status, stderr, stdout } = routing(argv);
		expect(status).toBe(2);
		expect(stdout).toBe('');
		expect(stderr).toContain(`Unknown option: ${flag}`);
		expect(stderr).not.toContain('Command not found');
		expect(stderr).toContain("Run 'routing --help' for usage.");
	});

	it('suggests the flag that was meant', () => {
		const { stderr } = routing(['--verison'], VERSIONED);
		expect(stderr).toContain("Did you mean '--version'?");
	});

	it('suggests a global option too', () => {
		const { stderr } = routing(['--profil']);
		expect(stderr).toContain("Did you mean '--profile'?");
	});

	it('points -V to --version', () => {
		expect(routing(['-V'], VERSIONED).stderr).toContain("Did you mean '--version'?");
	});

	it('keeps 127 for a command that does not exist', () => {
		const { status, stderr } = routing(['nope']);
		expect(status).toBe(127);
		expect(stderr).toContain('Command not found');
	});

	it('keeps 127 for a lone dash: it is not a flag', () => {
		expect(routing(['-']).status).toBe(127);
	});

	it('still answers --help after an unknown flag', () => {
		expect(routing(['--bogus', '--help']).status).toBe(0);
	});

	it('still reads a global before the command', () => {
		expect(routing(['--profile', 'x', 'status']).status).toBe(0);
	});
});

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

	it('routes as any other CLI: a word is a command, not data', () => {
		const { status, stdout, stderr } = implicit('hola');
		expect(status).toBe(127);
		expect(stdout).toBe('');
		expect(stderr).toContain("Command not found: 'hola'");
	});

	it('runs the command by its name', () => {
		const { status, stdout, stderr } = implicit('tool', 'hola');
		expect(status, stderr).toBe(0);
		expect(stdout).toContain('content: hola');
		expect(stderr).toBe('');
	});

	it('shows the help of the CLI with nothing to run', () => {
		const { status, stderr } = implicit();
		expect(status).toBe(2);
		expect(stderr).toContain('COMMANDS');
	});

	it('does not change when a plugin adds a command', () => {
		// The mode this replaces depended on counting commands
		expect(runFixture('implicit.js', ['hola'], { WITH_PLUGIN: '1' }).status).toBe(127);
		expect(runFixture('implicit.js', ['tool', 'hola'], { WITH_PLUGIN: '1' }).status).toBe(0);
	});

	it('keeps a value equal to the command name as data', () => {
		expect(implicit('tool', 'tool').stdout).toContain('content: tool');
	});
});
