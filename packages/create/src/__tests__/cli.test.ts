/**
 * The command line of the generator follows Runa's rules (T-239): --help and
 * --version without short aliases but -h, exit 2 on a usage error, with its
 * own words and the hint to read the help. Its arguments and exit codes are
 * contract (VERSIONING.md).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { main } from '../cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = join(here, '..', '..', '..', '..', 'examples', 'getting-started');
const HINT = "Run 'npm create @runa-cmd -- --help' for usage.";

let cwd: string;
beforeEach(() => {
	cwd = mkdtempSync(join(tmpdir(), 'runa-create-cli-'));
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

function run(...argv: string[]) {
	let stdout = '';
	let stderr = '';
	const code = main(argv, {
		version: '9.9.9',
		templateDir,
		runaVersion: '9.9.9',
		cwd,
		userAgent: 'npm/11.0.0 node/v24',
		out: (text) => {
			stdout += `${text}\n`;
		},
		err: (text) => {
			stderr += `${text}\n`;
		},
	});
	return { code, stdout, stderr };
}

describe('the command line of the generator', () => {
	it('creates the project, and says what to do next', () => {
		const result = run('my-tool');
		expect(result.code).toBe(0);
		expect(result.stdout).toContain('cd my-tool');
	});

	it.each([['--help'], ['-h']])('%s shows how to use it, with exit 0', (flag) => {
		const result = run(flag);
		expect(result.code).toBe(0);
		expect(result.stdout).toContain('Usage: npm create @runa-cmd <name>');
		expect(result.stdout).not.toContain('-v,');
	});

	it('--version shows the version, with exit 0', () => {
		expect(run('--version')).toEqual({ code: 0, stdout: '9.9.9\n', stderr: '' });
	});

	it.each([
		[['-v'], "Unknown option '-v'."],
		[['--verbose'], "Unknown option '--verbose'."],
		[['--help=yes'], "Option '--help' takes no value."],
		[[], "Missing the name of the project, as in 'npm create @runa-cmd my-tool'."],
		[
			['my-tool', 'extra'],
			"Unexpected argument 'extra': the name is a single word, as in 'my-tool'.",
		],
	])('%j is a usage error that says what is wrong', (argv, message) => {
		const result = run(...argv);
		expect(result.code).toBe(2);
		expect(result.stdout).toBe('');
		expect(result.stderr).toBe(`${message}\n${HINT}\n`);
	});

	it('a name that cannot be one says why, with exit 2', () => {
		const result = run('My Tool');
		expect(result.code).toBe(2);
		expect(result.stderr).toContain("'My Tool' can't be the name");
	});
});
