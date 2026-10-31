/**
 * The pure parts of built-in help: what it's about, and how it reads.
 * When it runs and who keeps each flag is in acceptance/help.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { commandClaims, findHelpTarget, renderHelp } from '../help.js';
import { defineCommand } from '../index.js';
import type { CLISchema, CommandSchema, OptionSchema } from '../types.js';
import { z } from '../zod.js';

const flag = (name: string, alias?: string[]): OptionSchema => ({
	name,
	type: 'boolean',
	required: false,
	alias,
});

const command = (name: string, overrides: Partial<CommandSchema> = {}): CommandSchema => ({
	name,
	description: `About ${name}`,
	fullPath: [name],
	args: [],
	options: [],
	hasOutput: false,
	...overrides,
});

const migrate = command('migrate', { fullPath: ['db', 'migrate'] });
const db = command('db', { description: '', subcommands: [migrate] });
const deploy = command('deploy', { options: [flag('force')] });

const cli: CLISchema = {
	meta: { name: 'app', version: '1.0.0' },
	commands: [deploy, db],
	globalOptions: [flag('help', ['-h'])],
};

describe('findHelpTarget', () => {
	it.each([
		['nothing', [], 'app'],
		['a command', ['deploy'], 'deploy'],
		['a group', ['db'], 'db'],
		['a nested command', ['db', 'migrate'], 'migrate'],
		['a path that is not in the schema', ['nope'], 'app'],
	])('with %s', (_case, path, expected) => {
		const target = findHelpTarget(cli, path);
		expect('meta' in target ? target.meta.name : target.name).toBe(expected);
	});

	it('adds the global options to a command', () => {
		const target = findHelpTarget(cli, ['deploy']) as CommandSchema;
		expect(target.options.map((option) => option.name)).toEqual(['force', 'help']);
	});

	it('leaves out what the command took for itself', () => {
		const host = { ...flag('host', ['-h']) };
		const named = { ...cli, commands: [command('serve', { options: [host] })] };
		const target = findHelpTarget(named, ['serve']) as CommandSchema;
		expect(target.options.find((option) => option.name === 'help')?.alias).toEqual([]);
	});
});

describe('commandClaims', () => {
	const claiming = defineCommand({
		meta: { name: 'c', description: 'c', options: { host: { alias: ['-h'] } } },
		options: { host: z.string(), help: z.boolean() },
		run() {},
	});
	const plain = defineCommand({ meta: { name: 'p', description: 'p' }, run() {} });

	it('finds an option named like the flag, and an alias', () => {
		expect(commandClaims(claiming, '--help')).toBe(true);
		expect(commandClaims(claiming, '-h')).toBe(true);
	});

	it('finds nothing in a command that declares neither', () => {
		expect(commandClaims(plain, '--help')).toBe(false);
		expect(commandClaims(plain, '-h')).toBe(false);
	});
});

describe('renderHelp', () => {
	it('shows the whole CLI', () => {
		const output = renderHelp({ ...cli, meta: { ...cli.meta, description: 'A sample' } });

		expect(output).toBe(
			[
				'app v1.0.0',
				'',
				'A sample',
				'',
				'USAGE',
				'  app <command> [options]',
				'',
				'COMMANDS',
				'  deploy  About deploy',
				'  db',
				'',
				'GLOBAL OPTIONS',
				'  -h, --help',
			].join('\n'),
		);
	});

	it('leaves out what a CLI does not have', () => {
		const output = renderHelp({ meta: { name: 'app' }, commands: [], globalOptions: [] });
		expect(output).toBe('app\n\nUSAGE\n  app [options]');
	});

	it('shows a command, with each detail of its options', () => {
		const output = renderHelp(
			command('deploy', {
				args: [
					{ name: 'service', type: 'string', required: true, isVariadic: false },
					{ name: 'tag', description: 'Tag', type: 'string', required: false, isVariadic: false },
				],
				options: [
					{
						name: 'env',
						description: 'Where',
						type: 'enum',
						enumValues: ['dev', 'prod'],
						required: true,
						env: 'APP_ENV',
					},
					{ name: 'size', type: 'number', required: false, defaultValue: 3, alias: ['s'] },
					{
						name: 'old',
						type: 'string',
						required: false,
						deprecated: 'Use new',
						alias: ['legacy'],
					},
					{ name: 'token', type: 'string', required: false, group: 'auth' },
				],
			}),
		);

		expect(output).toContain('deploy <service> [tag] [options]');
		expect(output).toMatch(/--env <dev\|prod> +Where \(required\) \[env: APP_ENV\]/);
		expect(output).toContain('-s, --size <number>');
		expect(output).toContain('(default: 3)');
		expect(output).toContain('--legacy, --old <string>');
		expect(output).toContain('(deprecated: Use new)');
		expect(output).toContain('AUTH OPTIONS');
	});

	it('shows the commands of a group', () => {
		const output = renderHelp(db);
		expect(output).toContain('db <command> [options]');
		expect(output).toContain('COMMANDS\n  migrate  About migrate');
	});
});
