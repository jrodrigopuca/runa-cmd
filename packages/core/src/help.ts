/**
 * @runa-cmd/core — Built-in help (ADR-0021)
 *
 * `--help` works from the first command, with no plugin. The renderer is plain
 * on purpose: @runa-cmd/help replaces it for themes and layout. Both show the
 * same sections, and a test keeps them aligned.
 */
import type {
	ArgSchema,
	CLISchema,
	Command,
	CommandSchema,
	HelpTarget,
	OptionMeta,
	OptionSchema,
} from './types.js';

export const HELP_TOKENS = ['--help', '-h'] as const;

const bare = (token: string): string => token.replace(/^-+/, '');

const BUILT_IN_HELP: OptionSchema = {
	name: 'help',
	flag: 'help',
	description: 'Show help',
	type: 'boolean',
	required: false,
	alias: ['-h'],
};

const BUILT_IN_VERSION: OptionSchema = {
	name: 'version',
	flag: 'version',
	description: 'Show the version',
	type: 'boolean',
	required: false,
};

/** Tell apart the two kinds of target a renderer can receive. */
function isCLI(target: HelpTarget): target is CLISchema {
	return 'meta' in target;
}

/** Whether a command declares this token as its own, which then wins (ADR-0021). */
export function commandClaims(command: Command, token: string): boolean {
	const name = bare(token);
	const optionMeta = (command.meta.options ?? {}) as Record<string, OptionMeta>;
	const aliases = Object.values(optionMeta).flatMap((meta) => meta.alias ?? []);
	return (
		aliases.map(bare).includes(name) ||
		(token.startsWith('--') && Object.hasOwn(command.options ?? {}, name))
	);
}

/** The options core provides, unless a global option already took their name. */
export function builtInOptions(globals: OptionSchema[], version?: string): OptionSchema[] {
	const taken = new Set(globals.flatMap((option) => [option.name, ...(option.alias ?? [])]));
	const shortFree = !taken.has('-h') && !taken.has('h');
	const options: OptionSchema[] = [];

	if (!taken.has('help')) {
		options.push(shortFree ? BUILT_IN_HELP : { ...BUILT_IN_HELP, alias: undefined });
	}
	if (version !== undefined && !taken.has('version')) options.push(BUILT_IN_VERSION);
	return options;
}

/** Global options work on every command, so its help lists those it didn't take. */
function withGlobals(
	command: CommandSchema,
	globals: OptionSchema[],
	isRoot: boolean,
): CommandSchema {
	const taken = new Set(
		command.options.flatMap((option) => [option.name, ...(option.alias ?? []).map(bare)]),
	);
	const inherited = globals
		.filter((option) => !taken.has(option.name))
		.map((option) => ({
			...option,
			alias: option.alias?.filter((alias) => !taken.has(bare(alias))),
			// The CLI's own options when the command is the CLI; else they come from above
			...(isRoot ? {} : { inherited: true }),
		}));
	return { ...command, options: [...command.options, ...inherited] };
}

function commandAt(schema: CLISchema, path: string[]): CommandSchema | undefined {
	let level = schema.commands;
	let found: CommandSchema | undefined;

	for (const name of path) {
		found = level.find((command) => command.name === name);
		level = found?.subcommands ?? [];
	}
	return found;
}

/**
 * What the help is about: where routing got to, or the whole CLI if it got
 * nowhere. Routing is core's: this only finds that place in the schema.
 */
export function findHelpTarget(schema: CLISchema, path: string[]): HelpTarget {
	const command = commandAt(schema, path);
	if (!command) return schema;

	// With runCLI the command is the CLI, and its name is already the first word
	const isRoot = path[0] === schema.root;
	const commandLine = isRoot ? command.fullPath : [schema.meta.name, ...command.fullPath];
	return { ...withGlobals(command, schema.globalOptions, isRoot), commandLine };
}

// ─── Plain renderer ─────────────────────────────────────────

function table(rows: string[][]): string[] {
	const width = Math.max(...rows.map(([left = '']) => left.length));
	return rows.map(([left = '', right = '']) => `  ${left.padEnd(width)}  ${right}`.trimEnd());
}

function optionFlags(option: OptionSchema): string {
	const aliases = (option.alias ?? []).map((alias) => {
		if (alias.startsWith('-')) return alias;
		return alias.length === 1 ? `-${alias}` : `--${alias}`;
	});
	const isList = option.type === 'array';
	const kind = isList ? (option.itemType ?? 'string') : option.type;
	const value =
		option.type === 'boolean'
			? ''
			: ` <${option.valueName ?? option.enumValues?.join('|') ?? kind}>${isList ? '...' : ''}`;
	// A boolean that starts on is turned off with --no-x: the flag says so
	const long = startsOn(option) ? `--[no-]${option.flag}` : `--${option.flag}`;
	return `${[...aliases, long].join(', ')}${value}`;
}

/** A boolean whose default is true: what a person can do with it is turn it off. */
function startsOn(option: OptionSchema): boolean {
	return option.type === 'boolean' && option.defaultValue === true;
}

/**
 * The default as help shows it: the author's text if there is one, else the
 * value. A false default or an empty list says nothing a flag doesn't, so
 * neither is shown.
 */
function defaultShown(option: OptionSchema): string | undefined {
	if (option.defaultDescription !== undefined) return option.defaultDescription;
	const { defaultValue } = option;
	if (defaultValue === undefined || defaultValue === false) return undefined;
	if (Array.isArray(defaultValue) && defaultValue.length === 0) return undefined;
	return String(defaultValue);
}

function optionDetails(option: OptionSchema): string {
	const details = [option.description ?? ''];
	if (option.required) details.push('(required)');
	const shown = defaultShown(option);
	if (shown !== undefined) details.push(`(default: ${shown})`);
	if (option.env) details.push(`[env: ${option.env}]`);
	if (option.deprecated) details.push(`(deprecated: ${option.deprecated})`);
	return details.filter(Boolean).join(' ');
}

const optionRow = (option: OptionSchema) => [optionFlags(option), optionDetails(option)];

function optionSections(options: OptionSchema[]): string[][] {
	const groups = new Map<string, OptionSchema[]>();
	for (const option of options) {
		const group = option.group ? `${option.group.toUpperCase()} OPTIONS` : 'OPTIONS';
		groups.set(group, [...(groups.get(group) ?? []), option]);
	}
	return [...groups].map(([group, members]) => [group, ...table(members.map(optionRow))]);
}

const commandRows = (commands: CommandSchema[]) =>
	table(commands.map((command) => [command.name, command.description]));

function renderCLI(cli: CLISchema): string[][] {
	const { name, version, description } = cli.meta;
	const sections = [[`${name}${version ? ` v${version}` : ''}`]];
	if (description) sections.push([description]);

	const usage = [name, cli.commands.length > 0 ? '<command>' : '', '[options]'];
	sections.push(['USAGE', `  ${usage.filter(Boolean).join(' ')}`]);
	if (cli.commands.length > 0) sections.push(['COMMANDS', ...commandRows(cli.commands)]);
	if (cli.globalOptions.length > 0) {
		sections.push(['GLOBAL OPTIONS', ...table(cli.globalOptions.map(optionRow))]);
	}
	return sections;
}

function argUsage({ name, required, isVariadic }: ArgSchema): string {
	const label = isVariadic ? `${name}...` : name;
	return required ? `<${label}>` : `[${label}]`;
}

/** An argument's description, with the values it takes if it's an enum. */
function argDetails({ description, enumValues }: ArgSchema): string {
	const values = enumValues?.length ? `(${enumValues.join(' | ')})` : '';
	return [description ?? '', values].filter(Boolean).join(' ');
}

function renderCommand(command: CommandSchema): string[][] {
	const path = (command.commandLine ?? command.fullPath).join(' ');
	const sections = [[path]];
	if (command.description) sections.push([command.description]);

	const hasSubcommands = (command.subcommands?.length ?? 0) > 0;
	const usage = [
		path,
		...(hasSubcommands ? ['<command>'] : []),
		...command.args.map(argUsage),
		'[options]',
	];
	sections.push(['USAGE', `  ${usage.join(' ')}`]);

	if (command.args.length > 0) {
		const rows = command.args.map((arg) => [arg.name, argDetails(arg)]);
		sections.push(['ARGUMENTS', ...table(rows)]);
	}
	// The command's own options first; the global ones work too, and go apart
	sections.push(...optionSections(command.options.filter((option) => !option.inherited)));
	const globals = command.options.filter((option) => option.inherited);
	if (globals.length > 0) sections.push(['GLOBAL OPTIONS', ...table(globals.map(optionRow))]);
	if (hasSubcommands) sections.push(['COMMANDS', ...commandRows(command.subcommands ?? [])]);
	return sections;
}

/** Help as plain text, with no color and no dependency on the terminal. */
export function renderHelp(target: HelpTarget): string {
	const sections = isCLI(target) ? renderCLI(target) : renderCommand(target);
	return sections.map((section) => section.join('\n')).join('\n\n');
}
