/**
 * @runa-cmd/core — What each key of the config file means (ADR-0040)
 *
 * A key at the root is a global option, or a command or group, which nest:
 * `{"store":"x","tag":{"add":{"priority":"high"}}}`. With runCLI there is no
 * command name to write, so the options of that command sit at the root.
 *
 * Nothing is ignored: a key that means nothing is a typo the person would never
 * find, because the program would just behave as if the file didn't say it.
 */
import type { ZodType } from 'zod';
import { ConfigError, ERROR_CODES, RunaError } from '../errors.js';
import { findSuggestion } from '../suggest.js';
import type { Command, CommandTree, OptionMeta } from '../types.js';
import type { ConfigFile } from './merge.js';

/** What editors read to validate the file: it says nothing to the CLI. */
const EDITOR_KEY = '$schema';

export interface ConfigTarget {
	commands: CommandTree;
	globalOptions: Record<string, ZodType>;
	globalMeta?: { options: Record<string, OptionMeta> };
	/** The command that needs no name (runCLI only) */
	rootName?: string;
}

/** Where a command's values came from, to name them in an error. */
export interface ConfigSource {
	filePath: string;
	/** Keys leading to the command's section. Empty if they sit at the root */
	path: string[];
}

function isCommand(entry: Command | CommandTree): entry is Command {
	return '_type' in entry && entry._type === 'runa:command';
}

const isSection = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

/** The commands and groups a key at the root can name. */
function namedCommands({ commands, rootName }: ConfigTarget): CommandTree {
	const { [rootName ?? '']: _root, ...named } = commands;
	return rootName === undefined ? commands : named;
}

function rootCommand({ commands, rootName }: ConfigTarget): Command | undefined {
	const root = rootName === undefined ? undefined : commands[rootName];
	return root && isCommand(root) ? root : undefined;
}

function commandOptionMeta(command: Command | undefined): Record<string, OptionMeta> {
	return (command?.meta.options ?? {}) as Record<string, OptionMeta>;
}

/** The options at the root of the file, and the ones it can't set. */
function rootOptions(target: ConfigTarget): { settable: string[]; terminalOnly: string[] } {
	const root = rootCommand(target);
	const meta = { ...target.globalMeta?.options, ...commandOptionMeta(root) };
	const names = [...Object.keys(target.globalOptions), ...Object.keys(root?.options ?? {})];

	return {
		settable: names.filter((name) => meta[name]?.configurable !== false),
		terminalOnly: names.filter((name) => meta[name]?.configurable === false),
	};
}

function unknownKey(file: ConfigFile, path: string[], key: string, known: string[]): ConfigError {
	const suggestion = findSuggestion(key, known);
	const hint = suggestion ? ` Did you mean '${suggestion}'?` : '';
	return new ConfigError(`${file.filePath}: unknown key '${[...path, key].join('.')}'.${hint}`);
}

function terminalOnlyKey(file: ConfigFile, path: string[], key: string): ConfigError {
	const name = [...path, key].join('.');
	return new ConfigError(`${file.filePath}: '${name}' can only be set at the terminal.`);
}

function checkSection(
	file: ConfigFile,
	entry: Command | CommandTree,
	path: string[],
	value: unknown,
): void {
	if (!isSection(value)) {
		throw new ConfigError(`${file.filePath}: '${path.join('.')}' must be an object.`);
	}

	if (isCommand(entry)) {
		const known = Object.keys(entry.options ?? {});
		const meta = commandOptionMeta(entry);
		for (const key of Object.keys(value)) {
			if (!known.includes(key)) throw unknownKey(file, path, key, known);
			if (meta[key]?.configurable === false) throw terminalOnlyKey(file, path, key);
		}
		return;
	}

	for (const [key, nested] of Object.entries(value)) {
		const child = Object.hasOwn(entry, key) ? entry[key] : undefined;
		if (!child) throw unknownKey(file, path, key, Object.keys(entry));
		checkSection(file, child, [...path, key], nested);
	}
}

/** Every key of the file must mean something, whichever command runs. */
export function assertValidConfig(file: ConfigFile, target: ConfigTarget): void {
	const named = namedCommands(target);
	const { settable, terminalOnly } = rootOptions(target);

	for (const [key, value] of Object.entries(file.values)) {
		if (key === EDITOR_KEY || settable.includes(key)) continue;

		const entry = Object.hasOwn(named, key) ? named[key] : undefined;
		if (entry) checkSection(file, entry, [key], value);
		else if (terminalOnly.includes(key)) throw terminalOnlyKey(file, [], key);
		else throw unknownKey(file, [], key, [...settable, ...Object.keys(named)]);
	}
}

/** The values of one command: the keys below it, so no other command gets them. */
export function commandValues(
	file: ConfigFile,
	path: string[],
	rootName?: string,
): { values: Record<string, unknown>; source: ConfigSource } {
	const sectionPath = path.length === 1 && path[0] === rootName ? [] : path;

	let values: unknown = file.values;
	for (const key of sectionPath) {
		values = isSection(values) && Object.hasOwn(values, key) ? values[key] : undefined;
	}

	return {
		values: isSection(values) ? values : {},
		source: { filePath: file.filePath, path: sectionPath },
	};
}

/**
 * A key at the root can't mean two things: the error is for the author, and it
 * shows up the first time they run the CLI, not when someone writes the file.
 */
export function assertConfigNames(target: ConfigTarget): void {
	const { settable } = rootOptions(target);

	for (const name of Object.keys(namedCommands(target))) {
		if (settable.includes(name)) {
			throw new RunaError(
				`Option '${name}' and command '${name}' share a name, so a config file can't tell them apart. Rename one.`,
				{ code: ERROR_CODES.CONFIG_COLLISION, exitCode: 1 },
			);
		}
	}
}
