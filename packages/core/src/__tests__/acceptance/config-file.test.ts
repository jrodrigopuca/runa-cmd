/**
 * The shape of the config file (ADR-0040), through real processes and real files.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, type Result, runFixture } from './harness.js';

beforeAll(assertFreshBuild);

function withFile(
	fixture: string,
	name: string,
	content: string,
	argv: string[],
	env: Record<string, string> = {},
): Result {
	const dir = mkdtempSync(join(tmpdir(), 'runa-config-'));
	writeFileSync(join(dir, `${name}.config.json`), content);
	const result = runFixture(fixture, argv, { CONFIG_DIR: dir, ...env });
	rmSync(dir, { recursive: true, force: true });
	return result;
}

const notes = (config: unknown, argv: string[], env?: Record<string, string>) =>
	withFile('config-file.js', 'notes', JSON.stringify(config), argv, env);

const options = (result: Result) => {
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout).options;
};

describe('a value belongs to one command', () => {
	it('sets the option of the command it is under', () => {
		expect(options(notes({ clear: { force: true } }, ['clear']))).toEqual({ force: true });
	});

	it('reaches a nested command through its group', () => {
		const config = { tag: { add: { priority: 'high' } } };
		expect(options(notes(config, ['tag', 'add']))).toEqual({ priority: 'high' });
	});

	it('does not reach a command with the same option name', () => {
		const config = { add: { priority: 'high' } };
		expect(options(notes(config, ['add']))).toEqual({ priority: 'high' });
		expect(options(notes(config, ['list']))).toEqual({ priority: [] });
		expect(options(notes(config, ['tag', 'add']))).toEqual({ priority: 'none' });
	});

	it('still loses to the terminal', () => {
		const config = { add: { priority: 'high' } };
		expect(options(notes(config, ['add', '--priority', 'cli']))).toEqual({ priority: 'cli' });
	});
});

describe('what the file can not say', () => {
	it('rejects an option at the root, naming the file and the key', () => {
		const { status, stderr } = notes({ force: true }, ['clear']);
		expect(status).toBe(2);
		expect(stderr).toContain('notes.config.json');
		expect(stderr).toContain("'force'");
	});

	it('rejects a typo in an option, and proposes the right key', () => {
		const { status, stderr } = notes({ clear: { forse: true } }, ['clear']);
		expect(status).toBe(2);
		expect(stderr).toContain("'clear.forse'");
		expect(stderr).toContain("'force'");
	});

	it('rejects a typo in a command, even when another one runs', () => {
		const { status, stderr } = notes({ clearr: { force: true } }, ['add']);
		expect(status).toBe(2);
		expect(stderr).toContain("'clearr'");
		expect(stderr).toContain("'clear'");
	});

	it('rejects a command that is not an object', () => {
		const { status, stderr } = notes({ clear: true }, ['clear']);
		expect(status).toBe(2);
		expect(stderr).toContain("'clear'");
		expect(stderr).toContain('object');
	});

	it('rejects a file that is not an object', () => {
		const { status, stderr } = notes(['clear'], ['clear']);
		expect(status).toBe(2);
		expect(stderr).toContain('notes.config.json');
	});

	it('accepts $schema, which editors need', () => {
		const config = { $schema: './notes.schema.json', add: { priority: 'high' } };
		expect(options(notes(config, ['add']))).toEqual({ priority: 'high' });
	});
});

describe('errors name the file', () => {
	it('names the file and the key of an invalid value', () => {
		const { status, stderr, stdout } = notes({ list: { priority: 'high' } }, ['list']);
		expect(status).toBe(2);
		expect(stdout).toBe('');
		expect(stderr).toContain('notes.config.json');
		expect(stderr).toContain("'list.priority'");
		expect(stderr).not.toContain('--priority');
	});

	it('keeps naming the flag when the invalid value came from the terminal', () => {
		const { status, stderr } = notes({}, ['list', '--priority']);
		expect(status).toBe(2);
		expect(stderr).toContain('--priority');
		expect(stderr).not.toContain('notes.config.json');
	});

	it('reports broken JSON as a problem of the file', () => {
		const { status, stderr } = withFile('config-file.js', 'notes', '{oops', ['add']);
		expect(status).toBe(2);
		expect(stderr).toContain('notes.config.json');
		expect(stderr).not.toContain('Unexpected error');
		expect(stderr).not.toContain('RUNA_DEBUG');
	});

	it('still shows the help with a broken file', () => {
		const { status, stdout } = withFile('config-file.js', 'notes', '{oops', ['--help']);
		expect(status).toBe(0);
		expect(stdout).toContain('USAGE');
	});
});

describe('global options', () => {
	const globals = (result: Result) => {
		expect(result.status, result.stderr).toBe(0);
		return JSON.parse(result.stdout).globalOptions;
	};

	it('take their value from the root of the file', () => {
		const result = globals(notes({ store: 'from-file.json', limit: 3 }, ['add']));
		expect(result).toMatchObject({ store: 'from-file.json', limit: 3 });
	});

	it('follow the same order as any option: CLI, env, config, default', () => {
		const config = { store: 'config.json' };
		const env = { NOTES_STORE: 'env.json' };

		expect(globals(notes({}, ['add'])).store).toBe('notes.json');
		expect(globals(notes(config, ['add'])).store).toBe('config.json');
		expect(globals(notes(config, ['add'], env)).store).toBe('env.json');
		expect(globals(notes(config, ['add', '--store', 'cli.json'], env)).store).toBe('cli.json');
	});

	it('reject an invalid value, naming the file and the key', () => {
		const { status, stderr, stdout } = notes({ store: 5 }, ['add']);
		expect(status).toBe(2);
		expect(stdout).toBe('');
		expect(stderr).toContain('notes.config.json');
		expect(stderr).toContain("'store'");
	});

	it('include the ones a plugin adds', () => {
		expect(globals(notes({ verbose: true }, ['add'])).verbose).toBe(true);
	});

	it('warn when a deprecated one comes from the file', () => {
		const { status, stderr } = notes({ legacy: 'x' }, ['add']);
		expect(status).toBe(0);
		expect(stderr).toContain('--legacy is deprecated');
	});

	it('do not need a valid file to answer --help or --version', () => {
		expect(notes({ store: 5 }, ['--help']).status).toBe(0);
		expect(notes({ store: 5 }, ['--version']).status).toBe(0);
	});
});

describe('an option the file can not set', () => {
	it('rejects a global that only the terminal can set', () => {
		const { status, stderr } = notes({ dangerous: true }, ['add']);
		expect(status).toBe(2);
		expect(stderr).toContain('notes.config.json');
		expect(stderr).toContain("'dangerous'");
		expect(stderr).toContain('terminal');
	});

	it('rejects a guardrail of a command, which a file must not turn off', () => {
		const { status, stderr } = notes({ wipe: { force: true } }, ['wipe']);
		expect(status).toBe(2);
		expect(stderr).toContain("'wipe.force'");
		expect(stderr).toContain('terminal');
	});

	it('keeps working from the terminal', () => {
		expect(options(notes({}, ['wipe', '--force']))).toEqual({ force: true });
	});
});

describe('a global named like a command', () => {
	it('fails at startup: in the file, that key would mean two things', () => {
		const { status, stderr } = notes({}, ['add'], { COLLISION: '1' });
		expect(status).toBe(1);
		expect(stderr).toContain("'tag'");
		expect(stderr).not.toContain('Unexpected error');
	});

	it('is not a problem for a CLI without a config file', () => {
		const result = runFixture('config-file.js', ['add'], { COLLISION: '1' });
		expect(result.status, result.stderr).toBe(0);
	});
});

describe('with runCLI', () => {
	const paint = (config: unknown, argv: string[] = []) =>
		withFile('config-root.js', 'paint', JSON.stringify(config), argv);

	it('takes the options at the root: there is no command name to write', () => {
		expect(options(paint({ darkColor: '#222' }))).toEqual({ darkColor: '#222' });
	});

	it('rejects an unknown key', () => {
		const { status, stderr } = paint({ darkColour: '#222' });
		expect(status).toBe(2);
		expect(stderr).toContain("'darkColor'");
	});

	it('names a key at the root without a command in front', () => {
		const { status, stderr } = paint({ darkColor: 5 });
		expect(status).toBe(2);
		expect(stderr).toContain("'darkColor'");
		expect(stderr).not.toContain('paint.darkColor');
	});
});
