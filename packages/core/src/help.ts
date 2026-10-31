/**
 * @runa-cmd/core — Built-in help (ADR-0021)
 *
 * `--help` works from the first command, with no plugin. The renderer is plain
 * on purpose: @runa-cmd/help replaces it for themes and layout. Both show the
 * same sections, and a test keeps them aligned.
 */
import type {
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
	description: 'Show help',
	type: 'boolean',
	required: false,
	alias: ['-h'],
};

const BUILT_IN_VERSION: OptionSchema = {
	name: 'version',
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
function withGlobals(command: CommandSchema, globals: OptionSchema[]): CommandSchema {
	const taken = new Set(
		command.options.flatMap((option) => [option.name, ...(option.alias ?? []).map(bare)]),
	);
	const inherited = globals
		.filter((option) => !taken.has(option.name))
		.map((option) => ({
			...option,
			alias: option.alias?.filter((alias) => !taken.has(bare(alias))),
		}));
	return { ...command, options: [...command.options, ...inherited] };
}

function deepestCommand(schema: CLISchema, argv: string[]): CommandSchema | undefined {
	let level = schema.commands;
	let found: CommandSchema | undefined;

	for (const token of argv) {
		if (token.startsWith('-')) continue;
		const match = level.find((command) => command.name === token);
		if (!match) break;
		found = match;
		level = match.subcommands ?? [];
	}
	return found;
}

/**
 * What the help is about: the command named in argv, or the one that runs
 * without a subcommand, or else the whole CLI.
 */
export function findHelpTarget(schema: CLISchema, argv: string[]): HelpTarget {
	const root = schema.commands.find((command) => command.name === schema.root);
	const command = deepestCommand(schema, argv) ?? root;
	return command ? withGlobals(command, schema.globalOptions) : schema;
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
	const value =
		option.type === 'boolean' ? '' : ` <${option.enumValues?.join('|') ?? option.type}>`;
	return `${[...aliases, `--${option.name}`].join(', ')}${value}`;
}

function optionDetails(option: OptionSchema): string {
	const details = [option.description ?? ''];
	if (option.required) details.push('(required)');
	if (option.defaultValue !== undefined) details.push(`(default: ${option.defaultValue})`);
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

function renderCommand(command: CommandSchema): string[][] {
	const path = command.fullPath.join(' ');
	const sections = [[path]];
	if (command.description) sections.push([command.description]);

	const hasSubcommands = (command.subcommands?.length ?? 0) > 0;
	const usage = [
		path,
		...(hasSubcommands ? ['<command>'] : []),
		...command.args.map((arg) => (arg.required ? `<${arg.name}>` : `[${arg.name}]`)),
		'[options]',
	];
	sections.push(['USAGE', `  ${usage.join(' ')}`]);

	if (command.args.length > 0) {
		const rows = command.args.map((arg) => [arg.name, arg.description ?? '']);
		sections.push(['ARGUMENTS', ...table(rows)]);
	}
	sections.push(...optionSections(command.options));
	if (hasSubcommands) sections.push(['COMMANDS', ...commandRows(command.subcommands ?? [])]);
	return sections;
}

/** Help as plain text, with no color and no dependency on the terminal. */
export function renderHelp(target: HelpTarget): string {
	const sections = isCLI(target) ? renderCLI(target) : renderCommand(target);
	return sections.map((section) => section.join('\n')).join('\n\n');
}
