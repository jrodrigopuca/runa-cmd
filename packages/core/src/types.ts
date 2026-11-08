/**
 * @runa-cmd/core — Core type definitions
 *
 * All TypeScript types, interfaces, and type utilities for the Runa CLI framework.
 * This is a type-only module — no runtime code.
 */
import type { ZodType, z } from 'zod';

// ─── Option Metadata ────────────────────────────────────────

/**
 * What an option needs besides its schema: aliases, env, help and config.
 * It goes in `meta.options`, by the option's key, so the Zod schema stays pure.
 */
export interface OptionMeta {
	/** CLI aliases, e.g. ['-e', '--environment'] */
	alias?: string[];
	/** Environment variable name, e.g. 'DEPLOY_ENV' */
	env?: string;
	/** Help group name, e.g. 'Deploy' */
	group?: string;
	/** Deprecation message, shown in help and when the option is used, e.g. 'Use --confirm instead' */
	deprecated?: string;
	/** What help calls the value, e.g. 'hex' for `--color <hex>`. Default: its type */
	valueName?: string;
	/**
	 * What help shows as the default, e.g. '~/.tool/control.sock' for a path
	 * built from the home folder. The command still gets the real value.
	 */
	defaultDescription?: string;
	/** False if a config file can't set it, as with a guardrail. Default: true */
	configurable?: boolean;
}

/** A command as it reaches run() and hooks: by then, it always has its name. */
export type NamedCommandMeta<TOptions extends Record<string, ZodType> = Record<string, ZodType>> =
	CommandMeta<TOptions> & {
		/** The command's own name: the last part of its path */
		name: string;
		/** The whole path, e.g. ['tag', 'add']: `name` alone can't tell it from `add` */
		path: string[];
	};

// ─── Command Metadata ───────────────────────────────────────

/** What a command says about itself: its name, description and option metadata. */
export interface CommandMeta<TOptions extends Record<string, ZodType> = Record<string, ZodType>> {
	/**
	 * The name of a CLI of one command, which runCLI requires. In defineCLI, the
	 * key names the command: this is optional there, and has to match it.
	 */
	name?: string;
	/** One line, shown in help and read by a model as the tool's description */
	description: string;
	/** Printed by `--version` when the command is the CLI, as with runCLI() */
	version?: string;
	/** Option metadata — keys MUST be a subset of TOptions keys */
	options?: { [K in keyof TOptions]?: OptionMeta };
}

// ─── CLI Metadata ───────────────────────────────────────────

/** What a CLI says about itself. */
export interface CLIMeta {
	/** The program name, as people type it. It names the CLI in help and in its config file */
	name: string;
	/** Printed by `--version` */
	version?: string;
	/** One line, shown at the top of the help */
	description?: string;
}

// ─── Inference Helpers ──────────────────────────────────────

/** Infer args types from a record of Zod schemas */
export type InferArgs<T extends Record<string, ZodType>> = {
	[K in keyof T]: z.infer<T[K]>;
};

/** Infer options types from a record of Zod schemas */
export type InferOptions<T extends Record<string, ZodType>> = {
	[K in keyof T]: z.infer<T[K]>;
};

// ─── Run Context ────────────────────────────────────────────

/** What the run() handler receives */
export interface RunContext<
	TArgs extends Record<string, ZodType> = Record<string, ZodType>,
	TOptions extends Record<string, ZodType> = Record<string, ZodType>,
> {
	/** The positional arguments, validated and typed by their schemas */
	args: InferArgs<TArgs>;
	/** The options, from the terminal, env, the config file or their defaults, validated and typed */
	options: InferOptions<TOptions>;
	/** The CLI's global options, untyped: the command doesn't declare them */
	globalOptions: Record<string, unknown>;
	/** The command that runs, with its whole path */
	command: NamedCommandMeta<TOptions>;
	/** The arguments of the process, as given, global options and what follows `--` included */
	rawArgs: string[];
	/** What's left after `--`, verbatim and unvalidated, if the command declares `rest: true`. Else `[]` */
	rest: string[];
	/** Aborted when the run must stop. Pass it on to whatever the command starts. */
	signal: AbortSignal;
}

// ─── Conditional Return Type ────────────────────────────────

/**
 * If TOutput extends ZodType, run() must return data matching the schema.
 * If not, run() returns whatever it wants, or nothing.
 */
export type RunReturn<TOutput, TResult = void> = TOutput extends ZodType
	? z.infer<TOutput> | Promise<z.infer<TOutput>>
	: TResult | Promise<TResult>;

/** What format() can read besides the data. */
export type FormatContext<
	TArgs extends Record<string, ZodType> = Record<string, ZodType>,
	TOptions extends Record<string, ZodType> = Record<string, ZodType>,
> = Pick<RunContext<TArgs, TOptions>, 'args' | 'options'>;

/** What format() receives: the data, once it's no longer a promise. */
export type RunResult<TOutput, TResult> = TOutput extends ZodType ? z.infer<TOutput> : TResult;

// ─── Command Config (Builder Input) ────────────────────────

/** What defineCommand() takes. */
export interface CommandConfig<
	TArgs extends Record<string, ZodType> = Record<string, ZodType>,
	TOptions extends Record<string, ZodType> = Record<string, ZodType>,
	TOutput extends ZodType | undefined = undefined,
	TResult = void,
> {
	/** Its name, description and option metadata */
	meta: CommandMeta<TOptions>;
	/** Positional arguments, in the order of their keys. Only the last one can be a z.array() */
	args?: TArgs;
	/** Named options. A key in camelCase is a flag in kebab-case: `darkColor` is `--dark-color` */
	options?: TOptions;
	/** The schema of what run() returns. It's checked, and an MCP tool gets it as structured data */
	output?: TOutput;
	/** Take what's left after `--` in `ctx.rest`. Without it, that's a usage error */
	rest?: boolean;
	/** What the command does. Return the data, and Runa shows it */
	run: (ctx: RunContext<TArgs, TOptions>) => RunReturn<TOutput, TResult>;
	/**
	 * What a person reads at the terminal, from what run() returned. A tool gets
	 * the data instead, and the command gains `--json`. It also receives the args
	 * and options, so what only changes the display stays out of the data.
	 */
	format?: (result: RunResult<TOutput, TResult>, context: FormatContext<TArgs, TOptions>) => string;
	/** False if this is only for people at a terminal: an MCP server won't offer it */
	tool?: boolean;
}

// ─── Command (Branded Runtime Object) ──────────────────────

/** A command, as defineCommand() returns it. Its fields are those of CommandConfig. */
export interface Command {
	/** Marks the object as a command */
	readonly _type: 'runa:command';
	/** See CommandConfig.meta */
	readonly meta: CommandMeta;
	/** See CommandConfig.args */
	readonly args?: Record<string, ZodType>;
	/** See CommandConfig.options */
	readonly options?: Record<string, ZodType>;
	/** See CommandConfig.output */
	readonly output?: ZodType;
	/** See CommandConfig.rest */
	readonly rest?: boolean;
	/** See CommandConfig.run */
	readonly run: (ctx: RunContext) => unknown;
	/** See CommandConfig.format */
	readonly format?: (result: unknown, context: FormatContext) => string;
	/** See CommandConfig.tool */
	readonly tool?: boolean;
}

// ─── Command Tree ───────────────────────────────────────────

/**
 * The commands of a CLI, by name. A nested object is a group:
 * `{ config: { get, set } }` gives `tool config get` and `tool config set`.
 */
export interface CommandTree {
	[key: string]: Command | CommandTree;
}

// ─── CLI Config ─────────────────────────────────────────────

/** Where and how a CLI finds its config file. */
export interface CLIConfigOptions {
	/** Config file base name, e.g. 'mycli' → looks for mycli.config.* */
	name: string;
	/** Additional config file loaders beyond built-in JSON */
	loaders?: ConfigLoader[];
	/** Directories to search for config files. Default: ['.', '~'] */
	searchPaths?: string[];
}

/** What defineCLI() takes. */
export interface CLIConfig {
	/** Its name, version and description */
	meta: CLIMeta;
	/** The commands, by the name people type */
	commands: CommandTree;
	/** Plugins, or functions that import one, which load when the CLI starts */
	plugins?: Array<
		| PluginConfig
		| (() => Promise<{
				/** The plugin, as the module's default export */
				default: PluginConfig;
		  }>)
	>;
	/** Middleware around every command. The first one is the outermost */
	middleware?: Middleware[];
	/** Read a config file. Without it, the CLI reads none */
	config?: CLIConfigOptions;
	/** Options every command takes, read in `ctx.globalOptions` */
	globalOptions?: Record<string, ZodType>;
	/** Metadata of the global options, by key, as `meta.options` for a command */
	globalMeta?: {
		/** Aliases, env, help and config of each global option, by its key */
		options?: Record<string, OptionMeta>;
	};
	/**
	 * Reject unknown options with a ValidationError (exit 2) and a
	 * did-you-mean suggestion. Default: true. Set to false to restore
	 * the v0.1.0 lenient behavior (unknown flags silently ignored).
	 */
	strictOptions?: boolean;
}

/** Options for runCLI(): a CLI config without what the command itself provides. */
export interface RunCLIOptions extends Omit<CLIConfig, 'meta' | 'commands'> {
	/** Arguments to parse. Default: process.argv.slice(2) */
	argv?: string[];
}

// ─── CLI (Branded Runtime Object) ───────────────────────────

/** A CLI, as defineCLI() returns it. */
export interface CLI {
	/** Marks the object as a CLI */
	readonly _type: 'runa:cli';
	/** What it was defined with */
	readonly config: CLIConfig;
	/**
	 * Run it, and end the process with its exit code. It's the entry point of a
	 * process: call it once, from main.ts. To run it in a test, use testCLI().
	 *
	 * @param argv - Default: process.argv.slice(2)
	 */
	run(argv?: string[]): Promise<void>;
}

// ─── Plugin System ──────────────────────────────────────────

/** What a plugin says about itself. */
export interface PluginMeta {
	/** Unique among the plugins of a CLI, and what errors and `dependencies` name it by */
	name: string;
	/** Informative only: Runa does not read it. Compatibility belongs in peerDependencies */
	version?: string;
	/** One line about what it does */
	description?: string;
	/** Names of other plugins this depends on */
	dependencies?: string[];
}

/**
 * What a plugin adds to the CLI, declared up front. Using a method without its
 * capability stops the CLI at startup, naming the plugin.
 */
export interface PluginCapabilities {
	/** Allows `api.addCommand()` */
	addCommands?: boolean;
	/** Allows `api.addGlobalOption()` */
	addGlobalOptions?: boolean;
	/** Allows `api.addMiddleware()` */
	addMiddleware?: boolean;
	/** Allows `api.replaceHelp()` */
	replaceHelp?: boolean;
}

/** A plugin, as definePlugin() takes it. */
export interface PluginConfig {
	/** Its name and what it depends on */
	meta: PluginMeta;
	/** What it adds to the CLI */
	capabilities?: PluginCapabilities;
	/** Extends the CLI when it starts: add options and commands, and register hooks */
	setup: (api: PluginAPI) => void | Promise<void>;
	/**
	 * Releases what setup() opened. It runs after the `cleanup` hook, and also
	 * when the CLI fails to start
	 */
	cleanup?: () => void | Promise<void>;
}

/** What a plugin's setup() receives to extend the CLI. */
export interface PluginAPI {
	/** Add a command at the root. Needs the `addCommands` capability */
	addCommand(name: string, command: Command): void;
	/** Add an option every command takes. Needs the `addGlobalOptions` capability */
	addGlobalOption(name: string, schema: ZodType, meta?: OptionMeta): void;
	/** Add a middleware around every command. Needs the `addMiddleware` capability */
	addMiddleware(middleware: Middleware): void;
	/** Run a handler at a step of every run */
	hook(name: HookName, handler: HookHandler): void;
	/** The CLI as help and MCP describe it: commands, args and options */
	getSchema(): CLISchema;
	/** The command tree, as it is now: what other plugins added included */
	getCommands(): CommandTree;
	/** The config file of the CLI, if it has one. With a path, only that command's values */
	getConfigValues(commandPath?: string[]): Promise<Record<string, unknown> | undefined>;
	/** Show help your way, instead of the built-in plain text. Only one plugin can */
	replaceHelp(show: HelpHandler): void;
}

/** What help is about. A command also lists the global options that work on it. */
export type HelpTarget = CLISchema | CommandSchema;

/**
 * Shows the help of a target, how the plugin wants. Write it to `output`:
 * stdout if the person asked for it, stderr if there was nothing to run.
 */
export type HelpHandler = (
	target: HelpTarget,
	output: NodeJS.WritableStream,
) => void | Promise<void>;

// ─── Lifecycle Hooks ────────────────────────────────────────

/** The steps of a run a plugin can hook into, in the order they happen. */
export const HOOK_NAMES = {
	/** First of all, before anything is parsed: a handler may rewrite `ctx.rawArgs` */
	BEFORE_PARSE: 'beforeParse',
	/** The global options are read. Help and `--mcp` stop the run here */
	ON_GLOBAL_FLAGS: 'onGlobalFlags',
	/** The command and its values are known */
	AFTER_PARSE: 'afterParse',
	/** Right before the middleware and the command */
	BEFORE_RUN: 'beforeRun',
	/** The command ended well. It doesn't run after a failure */
	AFTER_RUN: 'afterRun',
	/** Something failed: `ctx.error` says what. Set `ctx.handled` to print nothing */
	ON_ERROR: 'onError',
	/** Last, always: after an error and after Ctrl+C too */
	CLEANUP: 'cleanup',
} as const;

/** The name of a hook: one of the values of HOOK_NAMES. */
export type HookName = (typeof HOOK_NAMES)[keyof typeof HOOK_NAMES];

/** Where a run comes from: a person or script at the CLI, or a tool call. */
export type Invocation =
	| {
			/** A person or a script ran the CLI */
			surface: 'cli';
	  }
	| {
			/** A model called it as a tool through MCP: what it writes reaches the model */
			surface: 'tool';
			/** The name of the tool that was called */
			tool: string;
	  };

/** What a hook handler receives. What it has grows as the run goes on. */
export interface HookContext {
	/** The CLI's name, version and description */
	cli: CLIMeta;
	/** A person or script at the CLI, or a tool call through MCP */
	invocation: Invocation;
	/**
	 * In beforeParse, the whole argv, which a handler may rewrite before it's
	 * parsed. From onGlobalFlags on, only the command's part: without the global
	 * options, and without what follows `--`. run() gets the original as it was.
	 */
	rawArgs: string[];
	/** Aborted when the run must stop */
	signal: AbortSignal;
	/** The global options, from onGlobalFlags on */
	globalOptions?: Record<string, unknown>;
	/** The command that runs, from afterParse on */
	command?: NamedCommandMeta;
	/** Its positional arguments, from afterParse on */
	args?: Record<string, unknown>;
	/** Its options, from afterParse on */
	options?: Record<string, unknown>;
	/** What failed, in onError and in cleanup after a failure */
	error?: Error;
	/** Call this in onGlobalFlags to short-circuit the lifecycle */
	shortCircuit?: () => void;
	/** Set this in onError to prevent default error output */
	handled?: boolean;
}

/** A hook handler. It can be async, and the run waits for it. */
export type HookHandler = (ctx: HookContext) => void | Promise<void>;

// ─── Middleware ──────────────────────────────────────────────

/** What a middleware receives. */
export interface MiddlewareContext {
	/** Run the command, and the middleware after this one. Always `await` it, or throw to stop */
	next: () => Promise<void>;
	/** The CLI's global options. A middleware doesn't see the command's own */
	globalOptions: Record<string, unknown>;
	/** The command that runs, with its whole path */
	command: NamedCommandMeta;
}

/** The function a middleware runs. */
export type MiddlewareFn = (ctx: MiddlewareContext) => Promise<void>;

/** A middleware, as defineMiddleware() returns it. */
export interface Middleware {
	/** Marks the object as a middleware */
	readonly _type: 'runa:middleware';
	/** What it runs around a command */
	readonly handler: MiddlewareFn;
}

// ─── Config Loading ─────────────────────────────────────────

/** Reads config files of another format than JSON, which Runa reads by itself. */
export interface ConfigLoader {
	/** File extensions this loader handles, e.g. ['.json'] */
	extensions: string[];
	/** Read and parse the config file at the given path */
	load(filePath: string): Promise<unknown>;
}

// ─── Schema Introspection ───────────────────────────────────

/** A CLI described as data, as help and MCP read it. */
export interface CLISchema {
	/** The CLI's name, version and description */
	meta: CLIMeta;
	/** Its commands, groups included */
	commands: CommandSchema[];
	/** The options every command takes */
	globalOptions: OptionSchema[];
	/** Name of the command that runs without a subcommand: set by runCLI() */
	root?: string;
}

/** A command, or a group of commands, described as data. */
export interface CommandSchema {
	/** Its own name */
	name: string;
	/** One line about what it does */
	description: string;
	/** Full command path, e.g. ['config', 'set'] for nested commands */
	fullPath: string[];
	/** What a person types to run it, with the CLI, e.g. ['tool', 'config', 'set']. Set for help */
	commandLine?: string[];
	/** Its positional arguments, in order */
	args: ArgSchema[];
	/** Its options */
	options: OptionSchema[];
	/** Whether it declares an `output` schema */
	hasOutput: boolean;
	/** The commands of a group */
	subcommands?: CommandSchema[];
}

/** A positional argument, described as data. */
export interface ArgSchema {
	/** Its key in `args` */
	name: string;
	/** From its `.describe()` */
	description?: string;
	/** Its base type */
	type: ParamType;
	/** False if it has `.optional()` or `.default()` */
	required: boolean;
	/** From its `.default()` */
	defaultValue?: unknown;
	/** Whether it takes the rest of the values, as a z.array() does */
	isVariadic: boolean;
	/** The values a z.enum() allows */
	enumValues?: string[];
}

/** An option, described as data. */
export interface OptionSchema {
	/** The key in code, in config files and in MCP tools */
	name: string;
	/** The long flag, without dashes: what a person types */
	flag: string;
	/** From its `.describe()` */
	description?: string;
	/** `array` means the option repeats, with `itemType` values */
	type: ParamType;
	/** The type of each value of an option that repeats */
	itemType?: ParamType;
	/** What help calls the value, if the author named it */
	valueName?: string;
	/** False if it has `.optional()` or `.default()` */
	required: boolean;
	/** From its `.default()` */
	defaultValue?: unknown;
	/** What help shows instead of `defaultValue`, if the author wrote it */
	defaultDescription?: string;
	/** See OptionMeta.alias */
	alias?: string[];
	/** See OptionMeta.env */
	env?: string;
	/** See OptionMeta.group */
	group?: string;
	/** See OptionMeta.deprecated */
	deprecated?: string;
	/** The values a z.enum() allows */
	enumValues?: string[];
	/**
	 * A global option, in the help of a command: it works there, but isn't the
	 * command's own, so help lists it under GLOBAL OPTIONS. Not set when the
	 * command is the CLI, as with runCLI()
	 */
	inherited?: boolean;
}

// ─── Schema Walker Output ───────────────────────────────────

/** The base types Runa reads from a Zod schema. */
export const PARAM_TYPES = {
	/** z.string(), and any type Runa doesn't read otherwise */
	STRING: 'string',
	/** z.number(), z.int() included */
	NUMBER: 'number',
	/** z.boolean(): a flag, with its `--no-` */
	BOOLEAN: 'boolean',
	/** z.enum(): one of a fixed set of values */
	ENUM: 'enum',
	/** z.array(): an option that repeats, or the last positional */
	ARRAY: 'array',
} as const;

/** A base type: one of the values of PARAM_TYPES. */
export type ParamType = (typeof PARAM_TYPES)[keyof typeof PARAM_TYPES];

/** What Runa reads from the schema of one arg or option. */
export interface ParamMetadata {
	/** Key name from the schema record */
	name: string;
	/** Detected base type */
	zodType: ParamType;
	/** Whether the field is optional (has .optional() or .default()) */
	isOptional: boolean;
	/** Default value extracted from .default(), or undefined */
	defaultValue: unknown;
	/** Whether this is a z.array(): a variadic arg or an option that repeats */
	isArray: boolean;
	/** Type of each element of a z.array() */
	itemType?: ParamType;
	/** Enum values extracted from z.enum(), also as the element of a z.array() */
	enumValues?: string[];
	/** Description extracted from .describe() */
	description?: string;
}
