/**
 * Built-in help (ADR-0021), with real processes and no plugin that adds it.
 * The single-command case lives in single-command.test.ts.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture } from './harness.js';

const app = (argv: string[], env: Record<string, string> = {}) => runFixture('help.js', argv, env);

beforeAll(assertFreshBuild);

describe('help of the whole CLI', () => {
	it.each([['--help'], ['-h']])('%s shows commands and global options', (flag) => {
		const result = app([flag]);

		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toContain('app v2.0.0');
		expect(result.stdout).toContain('A sample app');
		expect(result.stdout).toContain('serve');
		expect(result.stdout).toContain('Start the server');
		expect(result.stdout).toContain('--profile');
		expect(result.stdout).toContain('--version');
	});

	it('runs cleanup like any other run', () => {
		expect(app(['--help']).stdout).toContain('cleanup-ran');
	});

	it('shows up for a command that does not exist', () => {
		const result = app(['nope', '--help']);
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('USAGE');
	});

	it('does not take --help after --', () => {
		const result = app(['serve', '--', '--help']);
		expect(result.stdout).toContain('serving on');
	});
});

describe('help of a command', () => {
	it('shows its arguments and options, and the global ones', () => {
		const { stdout, status } = app(['db', 'migrate', '--help']);

		expect(status).toBe(0);
		expect(stdout).toContain('db migrate <target> [options]');
		expect(stdout).toContain('Version to reach');
		expect(stdout).toContain('--profile');
	});

	it('shows the commands of a group', () => {
		const { stdout } = app(['db', '--help']);
		expect(stdout).toContain('migrate');
		expect(stdout).toContain('Run migrations');
	});
});

describe('nothing to run', () => {
	it.each([
		['the CLI', [], 'Start the server'],
		['a group', ['db'], 'Run migrations'],
	])('%s with no command shows help on stderr and exits with 2', (_case, argv, expected) => {
		const result = app(argv);

		expect(result.status).toBe(2);
		expect(result.stderr).toContain(expected);
		expect(result.stdout).not.toContain('USAGE');
	});

	it('runs cleanup', () => {
		expect(app([]).stdout).toContain('cleanup-ran');
	});

	it('hands a replaced help the stream to write to', () => {
		const result = app(['db'], { CUSTOM_HELP: '1' });
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('custom help for db');
	});

	it('still treats a typo as a command that does not exist', () => {
		const top = app(['serv']);
		expect(top.status).toBe(127);
		expect(top.stderr).toContain("Did you mean 'serve'?");

		const nested = app(['db', 'migrat']);
		expect(nested.status).toBe(127);
		expect(nested.stderr).toContain("Did you mean 'migrate'?");
	});
});

describe('a required global option', () => {
	const env = { REQUIRED_GLOBAL: '1' };

	it.each([
		['--help'],
		['-h'],
		['serve', '--help'],
		['--version'],
	])('does not get in the way of %s', (...argv) => {
		expect(
			app(
				argv.filter((token) => typeof token === 'string'),
				env,
			).status,
		).toBe(0);
	});

	it('is still required to run a command', () => {
		const result = app(['serve'], env);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain('--token');
	});
});

describe('a single command through defineCLI', () => {
	it.each([[['--help']], [['tool', '--help']]])('shows the command for %j', (argv) => {
		const { stdout, status } = runFixture('implicit.js', argv);
		expect(status).toBe(0);
		expect(stdout).toContain('tool <content> [options]');
		expect(stdout).not.toContain('<command>');
	});
});

describe('a command that declares the flag', () => {
	it('keeps -h, and --help still shows help', () => {
		expect(app(['serve', '-h', '0.0.0.0']).stdout).toContain('serving on 0.0.0.0');

		const { stdout, status } = app(['serve', '--help']);
		expect(status).toBe(0);
		expect(stdout).toContain('Start the server');
		expect(stdout).toContain('--help');
		expect(stdout).not.toContain('-h, --help');
	});

	it('keeps --help, and -h still shows help', () => {
		expect(app(['show', 'key', '--help']).stdout).toContain('help is true');
		expect(app(['show', '-h']).stdout).toContain('Key to read');
	});
});

describe('replacing the help', () => {
	const env = { CUSTOM_HELP: '1' };

	it('hands the target to the plugin, which shows it its own way', () => {
		const result = app(['serve', '--help'], env);
		expect(result.stdout).toContain('custom help for serve');
		expect(result.stdout).not.toContain('USAGE');
	});

	it('keeps a flag that a command declares', () => {
		expect(app(['serve', '-h', '0.0.0.0'], env).stdout).toContain('serving on 0.0.0.0');
	});

	it('fails at startup if two plugins want to', () => {
		const result = app(['--help'], { ...env, TWO_HELPS: '1' });
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("'custom-a' and 'custom-b'");
	});
});
