/**
 * What the plugin writes, through a real process: stdout here is a pipe, the
 * same as `tool --help | less` or a file.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectColorDepth } from '../ansi/detect.js';
import { styled } from '../primitives/styled.js';
import { resolveTheme } from '../theme.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'help-cli.js');
const ANSI = '\u001b[';

function help(argv: string[], env: Record<string, string> = {}) {
	const { NO_COLOR: _noColor, FORCE_COLOR: _forceColor, ...parentEnv } = process.env;
	return spawnSync(process.execPath, [fixture, ...argv], {
		encoding: 'utf8',
		env: { ...parentEnv, ...env },
	});
}

describe('styles outside a terminal', () => {
	it.each([
		['the CLI help', ['--help']],
		['the help of a command', ['add', '--help']],
		['the help of a nested command', ['tag', 'add', '--help']],
	])('%s has no ANSI in a pipe', (_name, argv) => {
		const { stdout } = help(argv);
		expect(stdout).toContain('USAGE');
		expect(stdout).not.toContain(ANSI);
	});

	it('has no ANSI with NO_COLOR, even if color is forced', () => {
		const { stdout } = help(['add', '--help'], { NO_COLOR: '1', FORCE_COLOR: '3' });
		expect(stdout).not.toContain(ANSI);
	});

	it('has no ANSI in the help of a run with nothing to do, on stderr', () => {
		const { status, stderr } = help([]);
		expect(status).toBe(2);
		expect(stderr).toContain('USAGE');
		expect(stderr).not.toContain(ANSI);
	});

	it('keeps the styles when color is forced', () => {
		expect(help(['--help'], { FORCE_COLOR: '1' }).stdout).toContain(ANSI);
	});
});

describe('styled() without color', () => {
	const none = { colorDepth: 'none', termWidth: 80 } as const;

	it.each([
		['bold', { bold: true }],
		['dim', { dim: true }],
		['italic', { italic: true }],
		['underline', { underline: true }],
		['color', { color: '#ff0000' }],
		['all of them', { bold: true, dim: true, italic: true, underline: true, color: 'red' }],
	])('leaves the text alone with %s', (_name, options) => {
		expect(styled('text', options, none)).toBe('text');
	});

	it('keeps the padding: that is layout, not style', () => {
		expect(styled('text', { bold: true, padding: [0, 1] }, none)).toBe(' text ');
	});

	it('still styles when the terminal can', () => {
		const color = { colorDepth: '16', termWidth: 80 } as const;
		expect(styled('text', { bold: true }, color)).toContain(ANSI);
	});
});

describe('a theme without color', () => {
	it('resolves every color to nothing', () => {
		const theme = resolveTheme(undefined, { colorDepth: 'none', termWidth: 80 });
		expect(Object.values(theme).join('')).toBe('');
	});
});

describe('detectColorDepth', () => {
	it('looks at the stream the text goes to, not always at stdout', () => {
		const { NO_COLOR, FORCE_COLOR } = process.env;
		delete process.env.NO_COLOR;
		delete process.env.FORCE_COLOR;

		const piped = { isTTY: false } as NodeJS.WriteStream;
		expect(detectColorDepth(piped)).toBe('none');

		const terminal = { isTTY: true, hasColors: () => true } as unknown as NodeJS.WriteStream;
		expect(detectColorDepth(terminal)).not.toBe('none');

		if (NO_COLOR !== undefined) process.env.NO_COLOR = NO_COLOR;
		if (FORCE_COLOR !== undefined) process.env.FORCE_COLOR = FORCE_COLOR;
	});
});

describe('USAGE (T-214)', () => {
	it('starts with the name of the CLI, so it can be copied', () => {
		expect(help(['add', '--help']).stdout).toContain('notes add <title> [tags...] [options]');
	});

	it('shows the whole path of a nested command', () => {
		expect(help(['tag', 'add', '--help']).stdout).toContain('notes tag add <title>');
	});
});
