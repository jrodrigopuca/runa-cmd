import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../../command.js';
import type { ConfigFile } from '../../config/merge.js';
import { assertConfigNames, assertValidConfig, commandValues } from '../../config/scope.js';
import { ConfigError, RunaError } from '../../errors.js';

const command = (name: string, options = {}) =>
	defineCommand({ meta: { name, description: name }, options, run() {} });

const commands = {
	clear: command('clear', { force: z.boolean() }),
	tag: { add: command('add', { priority: z.string() }) },
};
const globalOptions = { store: z.string() };
const file = (values: Record<string, unknown>): ConfigFile => ({ filePath: 'x.json', values });

describe('assertValidConfig', () => {
	const check = (values: Record<string, unknown>) =>
		assertValidConfig(file(values), { commands, globalOptions });

	it('accepts globals, commands, groups and $schema', () => {
		const values = {
			$schema: 'x',
			store: 'a',
			clear: { force: true },
			tag: { add: { priority: 'high' } },
		};
		expect(() => check(values)).not.toThrow();
	});

	it.each([
		['an option at the root', { force: true }, /'force'/],
		['a typo in a group', { tag: { ad: {} } }, /'tag\.ad'.*'add'/],
		['an option of another command', { clear: { priority: 'x' } }, /'clear\.priority'/],
		['a group holding a value', { tag: 'x' }, /'tag' must be an object/],
		['a nested command holding a value', { tag: { add: 1 } }, /'tag\.add' must be an object/],
		['a list for a command', { clear: [] }, /'clear' must be an object/],
	])('rejects %s', (_name, values, message) => {
		expect(() => check(values)).toThrow(ConfigError);
		expect(() => check(values)).toThrow(message);
	});

	it('is an exit 2: whoever wrote the file can fix it', () => {
		try {
			check({ nope: 1 });
			expect.unreachable();
		} catch (err) {
			expect(err).toMatchObject({ code: 'CONFIG_INVALID', exitCode: 2 });
		}
	});

	it('does not read a key inherited from Object', () => {
		const values = JSON.parse('{"constructor":{}}');
		expect(() => check(values)).toThrow(ConfigError);
	});

	it('takes the options of the root command at the root', () => {
		const root = { paint: command('paint', { darkColor: z.string() }), other: command('other') };
		const target = { commands: root, globalOptions: {}, rootName: 'paint' };

		expect(() => assertValidConfig(file({ darkColor: '#000', other: {} }), target)).not.toThrow();
		expect(() => assertValidConfig(file({ paint: {} }), target)).toThrow(/'paint'/);
	});
});

describe('commandValues', () => {
	const values = { store: 'a', clear: { force: true }, tag: { add: { priority: 'high' } } };

	it('returns only the keys below the command', () => {
		expect(commandValues(file(values), ['clear']).values).toEqual({ force: true });
		expect(commandValues(file(values), ['tag', 'add']).values).toEqual({ priority: 'high' });
	});

	it('returns nothing for a command the file does not mention', () => {
		expect(commandValues(file({}), ['tag', 'add']).values).toEqual({});
	});

	it('says where they came from', () => {
		expect(commandValues(file(values), ['tag', 'add']).source).toEqual({
			filePath: 'x.json',
			path: ['tag', 'add'],
		});
	});

	it('reads the root command from the root', () => {
		const { values: found, source } = commandValues(
			file({ darkColor: '#000' }),
			['paint'],
			'paint',
		);
		expect(found).toEqual({ darkColor: '#000' });
		expect(source.path).toEqual([]);
	});
});

describe('assertConfigNames', () => {
	it('rejects a global named like a command or group', () => {
		const clash = { commands, globalOptions: { tag: z.string() } };
		expect(() => assertConfigNames(clash)).toThrow(RunaError);
		expect(() => assertConfigNames(clash)).toThrow(/'tag'/);
	});

	it('rejects an option of the root command named like another command', () => {
		const root = { paint: command('paint', { other: z.string() }), other: command('other') };
		const target = { commands: root, globalOptions: {}, rootName: 'paint' };
		expect(() => assertConfigNames(target)).toThrow(/'other'/);
	});

	it('accepts the root command sharing a name with its own option', () => {
		const root = { paint: command('paint', { paint: z.string() }) };
		const target = { commands: root, globalOptions: {}, rootName: 'paint' };
		expect(() => assertConfigNames(target)).not.toThrow();
	});
});
