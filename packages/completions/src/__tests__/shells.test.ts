/**
 * Generated scripts in the real shells. The snapshots check the text: only a
 * shell can say whether it works.
 *
 * A shell that isn't installed skips its tests, unless RUNA_REQUIRE_SHELLS says
 * they have to run, as on CI: there, a missing shell is a broken setup, not a pass.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, 'fixtures', 'symbols-cli.js');
const zshTab = join(here, 'fixtures', 'zsh-tab.py');

const isWindows = process.platform === 'win32';
const required = Boolean(process.env.RUNA_REQUIRE_SHELLS);

function installed(command: string): boolean {
	return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0;
}

const runs = (shell: string) => !isWindows && (required || installed(shell));

const script = (shell: string) =>
	execFileSync(process.execPath, [cli, 'completions', shell], { encoding: 'utf8' });

let dir: string;
let binDir: string;

beforeAll(() => {
	if (isWindows) return;
	dir = mkdtempSync(join(tmpdir(), 'runa-shells-'));
	binDir = join(dir, 'bin');
	mkdirSync(binDir);
	chmodSync(cli, 0o755);
	symlinkSync(cli, join(binDir, 'sym'));
});

afterAll(() => {
	if (dir) rmSync(dir, { recursive: true, force: true });
});

describe.skipIf(!runs('bash'))('bash', () => {
	function complete(...words: string[]) {
		const file = join(dir, 'sym.bash');
		writeFileSync(file, script('bash'));
		const line = `sym ${words.join(' ')}`;
		const program = `
			source ${JSON.stringify(file)}
			COMP_WORDS=(sym ${words.map((word) => JSON.stringify(word)).join(' ')})
			COMP_CWORD=${words.length}
			COMP_LINE=${JSON.stringify(line)}
			COMP_POINT=${line.length}
			fn=$(complete -p sym | sed 's/.*-F \\([^ ]*\\).*/\\1/')
			$fn
			printf '%s\\n' "\${COMPREPLY[@]}"
		`;
		return execFileSync('bash', ['--norc', '-c', program], { encoding: 'utf8' }).trim().split('\n');
	}

	it('has valid syntax', () => {
		const file = join(dir, 'syntax.bash');
		writeFileSync(file, script('bash'));
		expect(spawnSync('bash', ['-n', file], { encoding: 'utf8' }).stderr).toBe('');
	});

	it('keeps an enum value with a space as one candidate', () => {
		expect(complete('show', '--mode', '')).toEqual(['fast', 'very\\ slow']);
	});

	it('completes a command with a dash', () => {
		expect(complete('group', '')).toEqual(['add-tag']);
	});

	// A positional or an option's value used to end up in the command path (T-240)
	it.each([
		[
			['hello', 'Ana', '--lang', ''],
			['en', 'pt'],
		],
		[['hello', 'Ana', '--l'], ['--lang']],
		[['hello', '--times', '2', '--l'], ['--lang']],
		[
			['hello', '--times', '2', 'Ana', '--lang', ''],
			['en', 'pt'],
		],
		[
			['hello', '--lang', ''],
			['en', 'pt'],
		],
	])('%j keeps completing the command', (words, expected) => {
		expect(complete(...words)).toEqual(expected);
	});

	it('an option value with the name of a command is still a value', () => {
		expect(complete('hello', '--lang', 'plain', '--t')).toEqual(['--times']);
	});

	it('loads through eval', () => {
		const program = `eval "$(${process.execPath} ${cli} completions bash)"; complete -p sym`;
		expect(spawnSync('bash', ['--norc', '-c', program]).status).toBe(0);
	});
});

describe.skipIf(!runs('zsh'))('zsh', () => {
	const tab = (home: string, ...lines: string[]) =>
		execFileSync('python3', [zshTab, home, binDir, ...lines], {
			encoding: 'utf8',
			timeout: 60_000,
		});

	const home = (name: string, zshrc: string) => {
		const path = join(dir, name);
		mkdirSync(path, { recursive: true });
		// A system zshrc can run its own compinit, whose security prompt eats the TAB
		writeFileSync(join(path, '.zshenv'), 'unsetopt GLOBAL_RCS\n');
		writeFileSync(join(path, '.zshrc'), zshrc);
		return path;
	};

	it('has valid syntax', () => {
		const file = join(dir, 'syntax.zsh');
		writeFileSync(file, script('zsh'));
		expect(spawnSync('zsh', ['-n', file], { encoding: 'utf8' }).stderr).toBe('');
	});

	describe('installed in fpath', () => {
		let output: string;

		beforeAll(() => {
			const path = home(
				'fpath',
				`fpath=(~/completions $fpath)\nautoload -Uz compinit && compinit -u -d ~/.zcomp\nPS1='$ '\n`,
			);
			mkdirSync(join(path, 'completions'));
			writeFileSync(join(path, 'completions', '_sym'), script('zsh'));
			output = tab(path, 'sym show --', 'sym show --mode ');
		}, 60_000);

		// The same as in bash: a positional doesn't end the completion (T-240)
		it('completes the values of an option after a positional', () => {
			const path = join(dir, 'fpath');
			const after = tab(path, 'sym hello Ana --lang ');
			expect(after).toContain('en');
			expect(after).toContain('pt');
		}, 60_000);

		it('shows a whole description, with brackets and colons', () => {
			expect(output).toContain('Mode [x]: how fast');
		});

		it('never runs a description as a command', () => {
			expect(output).not.toContain('command not found');
		});

		it('offers an enum value with a space', () => {
			expect(output).toContain('very');
			expect(output).toContain('slow');
			expect(output).toContain('fast');
		});
	});

	describe('loaded with eval', () => {
		let output: string;

		beforeAll(() => {
			const path = home(
				'eval',
				`autoload -Uz compinit && compinit -u -d ~/.zcomp\nPS1='$ '\neval "$(sym completions zsh)"\n`,
			);
			output = tab(path, 'sym ');
		}, 60_000);

		it('loads without errors', () => {
			expect(output).not.toContain('can only be called from completion function');
		});

		it('completes', () => {
			expect(output).toContain('show');
			expect(output).toContain('plain');
		});
	});
});

describe.skipIf(!runs('fish'))('fish', () => {
	function complete(line: string) {
		const file = join(dir, 'sym.fish');
		writeFileSync(file, script('fish'));
		return execFileSync('fish', ['--no-config', '-c', `source ${file}; complete -C '${line}'`], {
			encoding: 'utf8',
		});
	}

	it('has valid syntax', () => {
		const file = join(dir, 'syntax.fish');
		writeFileSync(file, script('fish'));
		expect(spawnSync('fish', ['-n', file], { encoding: 'utf8' }).status).toBe(0);
	});

	it('offers commands', () => {
		expect(complete('sym ')).toContain('show');
	});

	it('keeps an enum value with a space as one candidate', () => {
		const lines = complete('sym show --mode ').trim().split('\n');
		expect(lines.map((line) => line.split('\t')[0])).toContain('very slow');
	});

	it('completes a command with a dash', () => {
		expect(complete('sym group ')).toContain('add-tag');
	});

	// The same as in bash: a positional doesn't end the completion (T-240)
	it('completes the values of an option after a positional', () => {
		const values = complete('sym hello Ana --lang ').trim().split('\n');
		expect(values.map((line) => line.split('\t')[0])).toEqual(['en', 'pt']);
	});
});
