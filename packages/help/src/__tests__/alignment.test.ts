/**
 * There are two renderers, by decision (ADR-0021): the plain one in core and
 * this package's. A person who adds the plugin must get the same sections, in
 * the same order, with the same content. Only how they look can change.
 */
import { stripVTControlCharacters } from 'node:util';
import type { CLISchema, CommandSchema, HelpTarget } from '@runa-cmd/core';
import { renderHelp } from '@runa-cmd/core/internal';
import { describe, expect, it } from 'vitest';
import { getRenderContext } from '../ansi/detect.js';
import { defaultRenderer } from '../render.js';
import { resolveTheme } from '../theme.js';

const option = (name: string, group?: string) => ({
	name,
	description: `The ${name}`,
	type: 'string' as const,
	required: false,
	group,
});

const command: CommandSchema = {
	name: 'deploy',
	description: 'Deploy a service',
	fullPath: ['deploy'],
	args: [
		{ name: 'service', description: 'What', type: 'string', required: true, isVariadic: false },
	],
	options: [option('env'), option('token', 'auth')],
	hasOutput: false,
};

const group: CommandSchema = {
	name: 'db',
	description: 'Database',
	fullPath: ['db'],
	args: [],
	options: [option('profile')],
	hasOutput: false,
	subcommands: [{ ...command, name: 'migrate', fullPath: ['db', 'migrate'] }],
};

const cli: CLISchema = {
	meta: { name: 'app', version: '1.0.0', description: 'An app' },
	commands: [command, group],
	globalOptions: [option('profile'), option('token', 'auth')],
};

function plugin(target: HelpTarget): string {
	const ctx = getRenderContext();
	return defaultRenderer({
		schema: target,
		theme: resolveTheme(undefined, ctx),
		colorDepth: ctx.colorDepth,
		termWidth: ctx.termWidth,
	});
}

const titles = (text: string) =>
	stripVTControlCharacters(text)
		.split('\n')
		.filter((line) => /^[A-Z][A-Z ]+$/.test(line));

const words = (text: string) => new Set(stripVTControlCharacters(text).match(/[\w-]{3,}/g));

describe.each([
	['the whole CLI', cli, ['USAGE', 'COMMANDS', 'GLOBAL OPTIONS']],
	['a command', command, ['USAGE', 'ARGUMENTS', 'OPTIONS', 'AUTH OPTIONS']],
	['a group', group, ['USAGE', 'OPTIONS', 'COMMANDS']],
] as const)('both renderers on %s', (_name, target, expected) => {
	it('show the same sections, in the same order', () => {
		expect(titles(renderHelp(target))).toEqual(expected);
		expect(titles(plugin(target))).toEqual(expected);
	});

	it('show everything the plain one shows', () => {
		const missing = [...words(renderHelp(target))].filter(
			(word) => !words(plugin(target)).has(word),
		);
		expect(missing).toEqual([]);
	});
});
