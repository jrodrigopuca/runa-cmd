/**
 * @runa-cmd/core — defineCLI() + runCLI()
 *
 * The main CLI orchestrator. Wires together:
 * - Command resolution (including subcommands)
 * - Parsing pipeline (schema-walker → parseArgs-bridge → util.parseArgs → resolve)
 * - Lifecycle hooks (7-hook pipeline)
 * - Plugin loading (topological sort, setup/cleanup)
 * - Middleware execution (Koa/Hono onion model)
 * - Config loading
 * - Error handling
 */
import { parseArgs } from 'node:util';
import type { ZodType } from 'zod';
import { JSON_OPTION, JSON_SCHEMA } from './command.js';
import { type ConfigFile, loadConfigFile } from './config/merge.js';
import {
	assertConfigNames,
	assertValidConfig,
	type ConfigSource,
	commandValues,
} from './config/scope.js';
import {
	CommandNotFoundError,
	describeFailure,
	failureReason,
	isDebugEnabled,
	isUsageError,
	ProcessExit,
	RunaError,
	ValidationError,
} from './errors.js';
import { flagName } from './flag-name.js';
import { commandClaims, findHelpTarget, HELP_TOKENS, renderHelp } from './help.js';
import { getSchema } from './introspect.js';
import { createHookRegistry, type EmitResult } from './lifecycle.js';
import { deprecationWarnings } from './parse/deprecated.js';
import { buildParseArgsConfig } from './parse/parseargs-bridge.js';
import { distributeRest, resolveToolInput, resolveValues } from './parse/resolve.js';
import { walkSchema } from './parse/schema-walker.js';
import { assertKnownOptions, assertOptionValues } from './parse/strict.js';
import type { HelpSlot, PluginHostRefs } from './plugin.js';
import {
	resolvePlugins,
	runPluginCleanup,
	runPluginSetup,
	STATIC_GLOBAL_OPTION_SOURCE,
	topologicalSort,
	validateCommandNames,
	validateOptionCollisions,
	validateOptionNames,
} from './plugin.js';
import { watchForStop } from './stop.js';
import { findSuggestion } from './suggest.js';
import {
	sendToolReport,
	type ToolFailureReason,
	type ToolReport,
	takeToolRequest,
} from './tool-channel.js';
import { debugLine, optionEvents, type TraceEvent, type ValueSource } from './trace.js';
import type {
	CLI,
	CLIConfig,
	CLISchema,
	Command,
	CommandTree,
	FormatContext,
	HookContext,
	HookName,
	Middleware,
	MiddlewareContext,
	NamedCommandMeta,
	OptionMeta,
	PluginConfig,
	RunCLIOptions,
} from './types.js';

// ─── Command Resolution ─────────────────────────────────────

interface ResolvedCommand {
	command: Command;
	/** Command names from the root, as written in the tree */
	path: string[];
	remainingArgv: string[];
}

/** Routing stopped before a command: `path` is how far it got. */
class RouteNotFoundError extends CommandNotFoundError {
	constructor(
		name: string,
		suggestion: string | undefined,
		readonly path: string[],
		/** Nothing was wrong, only unfinished: argv ended before reaching a command */
		readonly isIncomplete: boolean,
		/** What stopped the route, if it was a flag and not a mistyped command */
		readonly flag?: string,
	) {
		super(name, suggestion);
	}
}

/** Where argv leads. Running a command and showing its help both start here. */
interface Route {
	command?: Command;
	path: string[];
	isIncomplete: boolean;
	/** A flag where a command should be: a usage error, not an unknown command */
	flag?: string;
}

/**
 * Check if a value is a Command (branded object).
 */
function isCommand(value: Command | CommandTree): value is Command {
	return '_type' in value && value._type === 'runa:command';
}

/**
 * Resolve a command from the command tree by walking argv tokens.
 * Supports nested subcommands.
 */
function resolveCommand(commands: CommandTree, tokens: string[]): ResolvedCommand {
	let current: CommandTree = commands;
	let consumed = 0;

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === undefined) break;

		// Stop at flags — they're not command names
		if (token.startsWith('-')) break;

		const entry = current[token];
		if (!entry) break;

		consumed++;

		if (isCommand(entry)) {
			return {
				command: entry,
				path: tokens.slice(0, consumed),
				remainingArgv: tokens.slice(consumed),
			};
		}

		// It's a subtree — continue walking
		current = entry;
	}

	const path = tokens.slice(0, consumed);
	const next = tokens[consumed];
	if (next === undefined) {
		throw new RouteNotFoundError(path.join(' ') || '(no command specified)', undefined, path, true);
	}

	// A lone `-` means stdin in many CLIs: it isn't a flag, whatever it is here
	const flag = next.length > 1 && next.startsWith('-') ? next : undefined;
	const suggestion = findSuggestion(next, Object.keys(current));
	throw new RouteNotFoundError([...path, next].join(' '), suggestion, path, false, flag);
}

// ─── Output Validation ──────────────────────────────────────

/** A command returning the wrong shape is an author defect, reported by field. */
const INVALID_OUTPUT = 'INVALID_OUTPUT';

/** The key names a command, so that's its name once a run reaches it (ADR-0043). */
function namedMeta(command: Command, path: string[]): NamedCommandMeta {
	return { ...command.meta, name: path.at(-1) as string };
}

function assertValidOutput(name: string, output: ZodType, result: unknown): void {
	const parsed = output.safeParse(result);
	if (parsed.success) return;

	const issues = parsed.error.issues.map(
		(issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
	);
	throw new RunaError(`Command '${name}' returned invalid output:\n${issues.join('\n')}`, {
		code: INVALID_OUTPUT,
		exitCode: 1,
	});
}

const asJsonText = (value: unknown): string => JSON.stringify(value, null, 2);

/** What decides how a result is shown. */
interface ResultDisplay extends FormatContext {
	name: string;
	asJson: boolean;
}

/** What a person sees of a result (ADR-0042). */
function resultText(command: Command, result: unknown, run: ResultDisplay): string | undefined {
	if (result === undefined) {
		if (!command.format) return undefined;
		throw new RunaError(`Command '${run.name}' declares format but returned nothing.`, {
			code: 'MISSING_RESULT',
			exitCode: 1,
		});
	}

	if (run.asJson) return asJsonText(result);
	if (command.format) return command.format(result, { args: run.args, options: run.options });
	return typeof result === 'string' ? result : asJsonText(result);
}

function printResult(command: Command, result: unknown, run: ResultDisplay): void {
	const text = resultText(command, result, run);
	if (text === undefined) return;
	process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}

function toolFailureReason(error: Error): ToolFailureReason {
	if (isUsageError(error)) return 'input';
	return error instanceof RunaError && error.code === INVALID_OUTPUT ? 'output' : 'other';
}

// ─── Middleware Composition ─────────────────────────────────

/**
 * Compose middleware into a nested chain.
 * Outermost middleware is first in the array.
 * Innermost next() calls the command execution function.
 */
function composeMiddleware(
	middlewareList: Middleware[],
	globalOptions: Record<string, unknown>,
	innerFn: () => Promise<void>,
): () => Promise<void> {
	// Build the chain from inside out
	let chain = innerFn;

	for (let i = middlewareList.length - 1; i >= 0; i--) {
		const mw = middlewareList[i];
		if (!mw) continue;
		const next = chain;
		chain = () => {
			const ctx: MiddlewareContext = {
				next: async () => {
					await next();
				},
				globalOptions,
			};
			return mw.handler(ctx);
		};
	}

	return chain;
}

// ─── Selecting the command and its values ───────────────────

/** A command to run from an object, with no argv to parse (ADR-0030). */
export interface ToolCall {
	/** Command path in the tree, e.g. ['config', 'set'] */
	path: string[];
	input: Record<string, unknown>;
}

/** What the two entry points produce. From here on, a run is one single path. */
interface Selection {
	command: Command;
	path: string[];
	parsedArgs: Record<string, unknown>;
	parsedOptions: Record<string, unknown>;
	optionSources: Record<string, ValueSource>;
	rest: string[];
	/** The person asked for the data, not for what format() makes of it */
	asJson: boolean;
}

interface SelectionScope {
	config: CLIConfig;
	commands: CommandTree;
	globalOptions: Record<string, ZodType>;
	globalMeta: { options: Record<string, OptionMeta> };
	hookCtx: HookContext;
	help: HelpSlot;
	schema: () => CLISchema;
	exitWith: (code: number) => void;
	loadConfig: (path: string[]) => Promise<CommandConfig>;
	env: Record<string, string | undefined>;
}

interface CommandConfig {
	configValues?: Record<string, unknown>;
	configSource?: ConfigSource;
}

function reportDeprecations(input: Parameters<typeof deprecationWarnings>[0]): void {
	for (const warning of deprecationWarnings(input)) {
		console.error(warning);
	}
}

/** The exit code of a usage error (ADR-0009). */
const USAGE_EXIT_CODE = 2;

/** What core answers by itself, instead of running a command. */
function findBuiltInAnswer(
	config: CLIConfig,
	route: Route,
	argv: string[],
): 'version' | 'help' | 'usage' | undefined {
	const isFree = (token: string) =>
		argv.includes(token) && !(route.command && commandClaims(route.command, token));

	if (config.meta.version !== undefined && isFree('--version')) return 'version';
	if (HELP_TOKENS.some(isFree)) return 'help';
	return route.isIncomplete ? 'usage' : undefined;
}

/** Report a flag before any command: same message as one after it, same exit code. */
function assertKnownFlag(
	token: string,
	{ config, globalOptions, globalMeta }: SelectionScope,
): void {
	const rawName = token.split('=')[0] as string;
	const name = rawName.replace(/^-+/, '');

	const longAliases = Object.values(globalMeta.options)
		.flatMap((meta) => meta.alias ?? [])
		.filter((alias) => alias.startsWith('--'))
		.map((alias) => alias.slice(2));

	assertKnownOptions({
		producedKeys: [name],
		knownKeys: new Set(),
		booleanKeys: new Set(),
		suggestionCandidates: [
			'help',
			...(config.meta.version === undefined ? [] : ['version']),
			...Object.keys(globalOptions).map(flagName),
			...longAliases,
		],
		tokens: [{ kind: 'option', name, rawName }],
	});
}

/** Select from argv. Undefined means the run ended here, as with --version. */
async function selectFromArgv(
	scope: SelectionScope,
	rest: string[],
	rootName: string | undefined,
): Promise<Selection | undefined> {
	const { config, commands, globalOptions, globalMeta, hookCtx, help } = scope;
	const commandArgv = hookCtx.rawArgs;

	// ─── Built-in --version and --help (ADR-0021) ─────
	// Globals were extracted above, so an option of the CLI never gets here.
	const route = findRoute(commands, commandArgv, rootName);
	const answer = findBuiltInAnswer(config, route, commandArgv);

	if (answer === 'version') {
		console.log(config.meta.version);
		return undefined;
	}

	if (answer) {
		// Asking for help is a success. Reaching it with nothing to run is a usage
		// error: stdout stays clean, and a script with an empty command fails.
		const output = answer === 'help' ? process.stdout : process.stderr;
		const target = findHelpTarget(scope.schema(), route.path);
		if (help.show) await help.show(target, output);
		else output.write(`${renderHelp(target)}\n`);
		if (answer === 'usage') scope.exitWith(USAGE_EXIT_CODE);
		return undefined;
	}

	// Globals were taken out already, so a flag here belongs to nobody
	if (route.flag) assertKnownFlag(route.flag, scope);

	// ─── Resolve command ──────────────────────────────
	const { command, path, remainingArgv } = resolveCommandFromTree(commands, commandArgv, rootName);

	hookCtx.command = namedMeta(command, path);

	// ─── Parse command args + options ──────────────────
	// --json stays out of command.options: it's for the terminal, not for run()
	// or a tool.
	const optionMetadata = [
		...walkSchema(command.options ?? {}),
		...(command.format ? walkSchema({ [JSON_OPTION]: JSON_SCHEMA }) : []),
	];

	const commandOptionMeta = command.meta.options as Record<string, OptionMeta> | undefined;

	const { parseArgsConfig, longAliasMap, knownKeys, booleanKeys } = buildParseArgsConfig(
		optionMetadata,
		commandOptionMeta,
		true, // Extra positionals are rejected in resolveValues, as a usage error
	);

	const cmdParseResult = parseArgs({
		...parseArgsConfig,
		args: remainingArgv,
		tokens: true,
	});
	const commandValues = cmdParseResult.values as Record<string, unknown>;

	// ─── Strict options check ─────────────────────────
	if (config.strictOptions !== false) {
		// Command canonical names + long aliases (= keys of the parseArgs config)
		const suggestionCandidates = Object.keys(parseArgsConfig.options ?? {});

		// Built-ins were handled above: if they got here, this is a mistyped one.
		suggestionCandidates.push('help');
		if (config.meta.version !== undefined) suggestionCandidates.push('version');

		// Globals are extracted before command parsing, but their names must
		// still be known here: parseArgs maps a stray global short flag to its
		// bare character, and typo'd globals should suggest the global name.
		for (const name of Object.keys(globalOptions)) {
			knownKeys.add(flagName(name));
			suggestionCandidates.push(flagName(name));
			for (const alias of globalMeta.options[name]?.alias ?? []) {
				if (alias.startsWith('--')) {
					knownKeys.add(alias.slice(2));
					suggestionCandidates.push(alias.slice(2));
				} else if (alias.startsWith('-') && alias.length === 2) {
					knownKeys.add(alias.slice(1));
				}
			}
		}

		assertKnownOptions({
			producedKeys: Object.keys(commandValues),
			knownKeys,
			booleanKeys,
			suggestionCandidates,
			tokens: cmdParseResult.tokens,
		});
	}

	assertOptionValues({
		tokens: cmdParseResult.tokens,
		options: parseArgsConfig.options ?? {},
		longAliasMap,
		optionMeta: commandOptionMeta,
	});

	const asJson = command.format !== undefined && commandValues[JSON_OPTION] === true;
	if (command.format) delete commandValues[JSON_OPTION];

	const { configValues, configSource } = await scope.loadConfig(path);
	const operands = distributeRest(cmdParseResult.positionals, rest, command.args ?? {});

	// Nothing reads what's left unless the command asked for it, so it can't stay
	// silent: as positionals, it gets the same error as any other extra (ADR-0036).
	const { parsedArgs, parsedOptions, optionSources } = resolveValues({
		env: scope.env,
		parseArgsResult: {
			values: commandValues,
			positionals: command.rest
				? operands.positionals
				: [...operands.positionals, ...operands.rest],
		},
		longAliasMap,
		schemas: {
			args: command.args,
			options: command.options,
		},
		meta: { options: commandOptionMeta },
		configValues,
		configSource,
	});

	reportDeprecations({
		provided: Object.keys(commandValues),
		longAliasMap,
		optionMeta: commandOptionMeta,
		configValues,
		env: scope.env,
	});

	return { command, path, parsedArgs, parsedOptions, optionSources, rest: operands.rest, asJson };
}

function commandAtPath(commands: CommandTree, path: string[]): Command {
	const notFound = new CommandNotFoundError(path.join(' '));
	let current: Command | CommandTree = commands;

	for (const segment of path) {
		if (isCommand(current) || !Object.hasOwn(current, segment)) throw notFound;
		current = current[segment] as Command | CommandTree;
	}

	if (!isCommand(current)) throw notFound;
	return current;
}

/** Select from a tool call: the path names the command, the input carries its values. */
async function selectFromInput(scope: SelectionScope, call: ToolCall): Promise<Selection> {
	const { commands, hookCtx } = scope;
	const command = commandAtPath(commands, call.path);
	hookCtx.command = namedMeta(command, call.path);

	const commandOptionMeta = command.meta.options as Record<string, OptionMeta> | undefined;
	const { configValues, configSource } = await scope.loadConfig(call.path);

	const { parsedArgs, parsedOptions, optionSources } = resolveToolInput({
		env: scope.env,
		input: call.input,
		schemas: { args: command.args, options: command.options },
		meta: { options: commandOptionMeta },
		configValues,
		configSource,
	});

	reportDeprecations({
		provided: Object.keys(call.input),
		longAliasMap: {},
		optionMeta: commandOptionMeta,
		configValues,
		env: scope.env,
	});

	return {
		command,
		path: call.path,
		parsedArgs,
		parsedOptions,
		optionSources,
		rest: [],
		asJson: false,
	};
}

// ─── CLI Execution Engine ───────────────────────────────────

interface LifecycleOptions {
	/** The command that runs without a subcommand (runCLI only) */
	rootName?: string;
	/** Run this call instead of reading the command from argv */
	toolCall?: ToolCall;
	/** Tells the process that started this one how the command went */
	report?: (report: ToolReport) => void;
	/** Takes the place of the process, under testCLI() */
	harness?: RunHarness;
}

/**
 * What a run needs from outside, handed in instead of read from the process, so
 * the machine that runs a test doesn't change its result.
 */
export interface RunHarness {
	env: Record<string, string | undefined>;
	configValues?: Record<string, unknown>;
	trace: (event: TraceEvent) => void;
	onResult: (value: unknown) => void;
	onError: (error: Error) => void;
	onExit: (code: number) => void;
}

/**
 * Run the full CLI lifecycle. Only selecting the command and its values depends
 * on the entry point: everything else is what any run goes through.
 */
async function runCLILifecycle(
	config: CLIConfig,
	argv: string[],
	{ rootName, toolCall, report, harness }: LifecycleOptions = {},
): Promise<void> {
	// ─── State ─────────────────────────────────────────
	const hookRegistry = createHookRegistry();
	const mutableCommands: CommandTree = { ...config.commands };
	const mutableGlobalOptions: Record<string, ZodType> = { ...(config.globalOptions ?? {}) };
	const mutableGlobalMeta: { options: Record<string, OptionMeta> } = {
		options: { ...(config.globalMeta?.options ?? {}) },
	};
	const mutableMiddleware: Middleware[] = [...(config.middleware ?? [])];
	let sortedPlugins: PluginConfig[] = [];

	// Registrant per global option name (ADR-0014): statically-declared
	// globals are seeded here; plugin registrations append via addGlobalOption.
	const globalOptionSources = new Map<string, string[]>();
	for (const name of Object.keys(mutableGlobalOptions)) {
		globalOptionSources.set(name, [STATIC_GLOBAL_OPTION_SOURCE]);
	}

	const help: HelpSlot = {};
	const currentSchema = (): CLISchema => ({
		...getSchema(
			{ ...config, commands: mutableCommands },
			mutableGlobalOptions,
			mutableGlobalMeta.options,
		),
		root: rootName,
	});

	const stop = watchForStop(report !== undefined, harness === undefined);
	const env = harness?.env ?? (process.env as Record<string, string | undefined>);
	const debug = isDebugEnabled(env as NodeJS.ProcessEnv);

	const trace = (event: TraceEvent): void => {
		harness?.trace(event);
		const line = debug ? debugLine(event) : undefined;
		if (line) console.error(line);
	};

	// Hook context that grows as we progress through the lifecycle
	const hookCtx: HookContext = {
		cli: config.meta,
		invocation: toolCall ? { surface: 'tool', tool: toolCall.path.join('_') } : { surface: 'cli' },
		rawArgs: argv,
		signal: stop.signal,
	};

	let lifecycleError: Error | undefined;
	let failureExitCode: number | undefined;
	let commandResult: unknown;
	let leftByExit = false;

	const finishRun = async (): Promise<void> => {
		// ─── cleanup (ALWAYS runs) ────────────────────────
		try {
			await emitHook('cleanup');
		} catch (hookErr) {
			// ADR-0009: same treatment as onError — log the defect, keep cleaning up.
			console.error('runa: cleanup hook threw:', hookErr);
		}

		// Plugin cleanup in reverse topological order
		if (sortedPlugins.length > 0) {
			const cleanupErrors = await runPluginCleanup(sortedPlugins);
			if (cleanupErrors.length > 0) {
				for (const err of cleanupErrors) {
					console.error(`Plugin cleanup error: ${err.message}`);
				}
			}
		}

		stop.finish();

		// Exit only after cleanup: process.exit inside catch would skip the rest of
		// this block. It can't go after it either: a return in the try never gets there.
		const exitCode = stop.exitCode ?? failureExitCode;
		if (exitCode === undefined) return;

		if (harness) harness.onExit(exitCode);
		else if (hookCtx.handled) {
			// A plugin that truly recovered keeps control by setting process.exitCode.
			process.exitCode ??= exitCode;
		} else {
			process.exit(exitCode);
		}
	};

	const configTarget = {
		commands: mutableCommands,
		globalOptions: mutableGlobalOptions,
		globalMeta: mutableGlobalMeta,
		rootName,
	};

	/** Read when a run needs it: a broken file must not get in the way of --help. */
	const readConfigFile = async (): Promise<ConfigFile | undefined> => {
		if (harness) {
			const values = harness.configValues;
			return values && { filePath: 'testCLI config', values };
		}
		return config.config && loadConfigFile(config.config);
	};

	let tracedConfig = false;
	const loadCheckedConfig = async () => {
		const file = await readConfigFile();
		if (!tracedConfig && (config.config || file)) {
			tracedConfig = true;
			trace({ step: 'config', file: file?.filePath });
		}
		if (file) assertValidConfig(file, configTarget);
		return file;
	};

	const emitHook = async (name: HookName): Promise<EmitResult> => {
		if (hookRegistry.getHandlers(name).length === 0) return { shortCircuited: false };
		const started = performance.now();
		const result = await hookRegistry.emit(name, hookCtx);
		trace({ step: 'hook', name, ms: Math.round(performance.now() - started) });
		return result;
	};

	const loadConfig = async (path: string[]): Promise<CommandConfig> => {
		const file = await loadCheckedConfig();
		if (!file) return {};
		const { values, source } = commandValues(file, path, rootName);
		return { configValues: values, configSource: source };
	};

	try {
		// ─── Plugin resolution ────────────────────────────
		if (config.plugins && config.plugins.length > 0) {
			const resolvedPlugins = await resolvePlugins(config.plugins);
			sortedPlugins = topologicalSort(resolvedPlugins);

			// Create plugin host refs
			const pluginRefs: PluginHostRefs = {
				commands: mutableCommands,
				globalOptions: mutableGlobalOptions,
				globalMeta: mutableGlobalMeta,
				middleware: mutableMiddleware,
				hookRegister: (name, handler) => hookRegistry.register(name, handler),
				getSchema: currentSchema,
				getConfigValues: async (path) =>
					path ? (await loadConfig(path)).configValues : (await loadCheckedConfig())?.values,
				help,
				globalOptionSources,
			};

			await runPluginSetup(sortedPlugins, pluginRefs);
		}

		// ─── Option collision validation (ADR-0014) ─────
		// Post-plugin-setup is the earliest point where the full option
		// surface (plugin globals + plugin commands) exists. Runs before
		// any parsing on every invocation; throws RunaError OPTION_COLLISION.
		validateCommandNames(mutableCommands, rootName);
		validateOptionNames(mutableCommands, mutableGlobalOptions);
		validateOptionCollisions(
			mutableCommands,
			mutableGlobalOptions,
			mutableGlobalMeta,
			globalOptionSources,
		);
		if (config.config || harness?.configValues) assertConfigNames(configTarget);

		// ─── beforeParse ──────────────────────────────────
		await emitHook('beforeParse');
		// Handlers may have mutated hookCtx.rawArgs
		const currentArgv = hookCtx.rawArgs;

		// ─── Rest split (ADR-0012) ────────────────────────
		// Split at the FIRST `--`: `head` flows through the entire pipeline
		// (global extraction → resolution → parseArgs → strict check), `rest`
		// bypasses everything and lands verbatim on the run context. Because
		// the global extractor below only ever sees `head`, a token like
		// `--help` after `--` can never be stolen as a global flag.
		// Only the first `--` splits; later `--` tokens are ordinary rest content.
		const sepIdx = currentArgv.indexOf('--');
		const head = sepIdx === -1 ? currentArgv : currentArgv.slice(0, sepIdx);
		const rest = sepIdx === -1 ? [] : currentArgv.slice(sepIdx + 1);
		hookCtx.rawArgs = head;

		// ─── Parse global options ─────────────────────────
		let parsedGlobalOptions: Record<string, unknown> = {};

		if (Object.keys(mutableGlobalOptions).length > 0) {
			const globalMetadata = walkSchema(mutableGlobalOptions);
			const { parseArgsConfig, longAliasMap } = buildParseArgsConfig(
				globalMetadata,
				mutableGlobalMeta.options,
				true, // Allow positionals (command names + args)
			);

			// Build lookup maps for global options:
			// longNames: '--verbose' → 'verbose' (canonical name)
			// shortNames: '-V' → 'verbose' (canonical name)
			// booleanGlobals: set of canonical names that are boolean type
			const longNames = new Map<string, string>();
			const shortNames = new Map<string, string>();
			const booleanGlobals = new Set<string>();

			const registeredOptions = parseArgsConfig.options ?? {};
			for (const [name, opt] of Object.entries(registeredOptions)) {
				const canonical = longAliasMap[name] ?? name;
				longNames.set(`--${name}`, canonical);
				// --no-* negation for booleans
				if (opt?.type === 'boolean') {
					booleanGlobals.add(canonical);
					longNames.set(`--no-${name}`, canonical);
				}
				if (opt && 'short' in opt && opt.short) {
					shortNames.set(`-${opt.short}`, canonical);
				}
			}
			// Long aliases
			for (const [alias, canonical] of Object.entries(longAliasMap)) {
				longNames.set(`--${alias}`, canonical);
			}

			// Manual argv split: extract global option tokens, leave the rest.
			// Operates on `head` only — post-`--` tokens are never candidates.
			const globalArgv: string[] = [];
			const commandArgv: string[] = [];
			let i = 0;

			while (i < head.length) {
				const token = head[i] ?? '';

				// Handle --opt=val form
				const eqIdx = token.indexOf('=');
				const tokenKey = eqIdx > 0 ? token.slice(0, eqIdx) : token;

				if (longNames.has(tokenKey) || shortNames.has(tokenKey)) {
					const canonical = longNames.get(tokenKey) ?? shortNames.get(tokenKey) ?? '';
					const isBool = booleanGlobals.has(canonical);

					if (eqIdx > 0) {
						// --opt=val — single token, always extract
						globalArgv.push(token);
						i++;
					} else if (isBool) {
						// --verbose or --no-verbose — boolean, no value token
						globalArgv.push(token);
						i++;
					} else {
						// --opt val — string option, extract both tokens
						globalArgv.push(token);
						i++;
						if (i < head.length) {
							globalArgv.push(head[i] ?? '');
							i++;
						}
					}
				} else {
					commandArgv.push(token);
					i++;
				}
			}

			// Now parse ONLY the extracted global tokens with parseArgs
			const globalParseResult = parseArgs({
				...parseArgsConfig,
				args: globalArgv,
				tokens: true,
			});
			const globalValues = globalParseResult.values as Record<string, unknown>;

			assertOptionValues({
				tokens: globalParseResult.tokens,
				options: registeredOptions,
				longAliasMap,
				optionMeta: mutableGlobalMeta.options,
			});

			// Asking how to use a CLI can't require already knowing its options.
			const answer = findBuiltInAnswer(
				config,
				findRoute(mutableCommands, commandArgv, rootName),
				commandArgv,
			);
			// With a tool call, the command comes from the call, not from argv.
			const { configValues, configSource } =
				answer && !toolCall ? ({} as CommandConfig) : await loadConfig([]);
			try {
				const { parsedOptions, optionSources } = resolveValues({
					parseArgsResult: { values: globalValues, positionals: [] },
					longAliasMap,
					schemas: { options: mutableGlobalOptions },
					meta: { options: mutableGlobalMeta.options },
					configValues,
					configSource,
					env,
				});
				parsedGlobalOptions = parsedOptions;
				const names = Object.keys(mutableGlobalOptions);
				optionEvents('global', names, parsedOptions, optionSources).forEach(trace);
			} catch (err) {
				const isQuestion = answer === 'help' || answer === 'version';
				if (!isQuestion || !(err instanceof ValidationError)) throw err;
			}

			reportDeprecations({
				provided: Object.keys(globalValues),
				longAliasMap,
				optionMeta: mutableGlobalMeta.options,
				configValues,
				env,
			});

			// Pass remaining argv (command tokens only) to command parsing
			hookCtx.rawArgs = commandArgv;
		}

		hookCtx.globalOptions = parsedGlobalOptions;

		// ─── onGlobalFlags ────────────────────────────────
		const globalFlagsResult = await emitHook('onGlobalFlags');
		if (globalFlagsResult.shortCircuited) {
			// Short-circuit: skip command resolution and execution, go to cleanup
			return;
		}

		// ─── Select the command and its values ────────────
		const scope: SelectionScope = {
			config,
			commands: mutableCommands,
			globalOptions: mutableGlobalOptions,
			globalMeta: mutableGlobalMeta,
			hookCtx,
			help,
			schema: currentSchema,
			exitWith: (code) => {
				failureExitCode = code;
			},
			loadConfig,
			env,
		};
		const selection = toolCall
			? await selectFromInput(scope, toolCall)
			: await selectFromArgv(scope, rest, rootName);
		if (!selection) return;

		const { command, path, parsedArgs, parsedOptions, optionSources } = selection;
		const meta = namedMeta(command, path);
		const optionNames = Object.keys(command.options ?? {});
		optionEvents('command', optionNames, parsedOptions, optionSources).forEach(trace);

		hookCtx.args = parsedArgs;
		hookCtx.options = parsedOptions;

		// ─── afterParse ───────────────────────────────────
		await emitHook('afterParse');

		// ─── beforeRun ────────────────────────────────────
		await emitHook('beforeRun');

		// ─── Middleware chain + command execution ──────────
		const runContext = {
			args: parsedArgs,
			options: parsedOptions,
			globalOptions: parsedGlobalOptions,
			command: meta,
			rawArgs: argv,
			rest: selection.rest,
			signal: stop.signal,
		};

		const innerFn = async () => {
			report?.({ kind: 'running' });
			const started = performance.now();
			commandResult = await command.run(runContext);
			trace({ step: 'run', command: path, ms: Math.round(performance.now() - started) });
			report?.({ kind: 'ran' });

			// Validate output schema if present
			if (command.output) {
				assertValidOutput(meta.name, command.output, commandResult);
			}
			report?.({ kind: 'result', value: commandResult });
			harness?.onResult(commandResult);

			// A tool hands the data to the server, which never runs format()
			if (!report) {
				printResult(command, commandResult, {
					name: meta.name,
					asJson: selection.asJson,
					args: parsedArgs,
					options: parsedOptions,
				});
			}
		};

		const chain = composeMiddleware(mutableMiddleware, parsedGlobalOptions, innerFn);

		await stop.guard(chain);

		// ─── afterRun ─────────────────────────────────────
		await emitHook('afterRun');
	} catch (err) {
		// A real exit ends here: no onError, no cleanup, no message
		if (err instanceof ProcessExit) {
			leftByExit = true;
			throw err;
		}

		lifecycleError = err instanceof Error ? err : new Error(err == null ? '' : String(err));
		harness?.onError(lifecycleError);

		// ─── onError ──────────────────────────────────────
		hookCtx.error = lifecycleError;

		try {
			await emitHook('onError');
		} catch (hookErr) {
			// ADR-0009: log to stderr, never rethrow — a broken error handler must
			// not prevent cleanup, but its own defect must not vanish either.
			// The ORIGINAL error still drives exit behavior below.
			console.error('runa: onError handler threw:', hookErr);
		}

		failureExitCode = lifecycleError instanceof RunaError ? lifecycleError.exitCode : 1;

		// Report BEFORE cleanup: the reason stays visible even if cleanup hangs.
		// `handled` means the plugin owns the output, not that the run succeeded.
		if (!hookCtx.handled) {
			const subject = hookCtx.command?.name ?? config.meta.name;
			// An agent cannot use a hint for people, unless the operator asked for details.
			const helpCommand = report ? undefined : config.meta.name;
			console.error(
				report && !debug
					? failureReason(lifecycleError, subject)
					: describeFailure(lifecycleError, subject, debug, helpCommand),
			);
		}
		report?.({ kind: 'failed', reason: toolFailureReason(lifecycleError) });
	} finally {
		if (leftByExit) stop.finish();
		else await finishRun();
	}
}

/**
 * Route argv to a command.
 *
 * Root mode (runCLI): the root command takes everything and consumes nothing,
 * so a value equal to its name is data. Only another command's name routes
 * away from it, and `--` passes even that as data (ADR-0023).
 */
function resolveCommandFromTree(
	commands: CommandTree,
	argv: string[],
	rootName?: string,
): ResolvedCommand {
	if (rootName !== undefined) {
		const root = commands[rootName];
		const first = argv[0] ?? '';
		const isSubcommand = first !== rootName && Object.hasOwn(commands, first);
		if (root && isCommand(root) && !isSubcommand) {
			return { command: root, path: [rootName], remainingArgv: argv };
		}
		return resolveCommand(commands, argv);
	}

	// Implicit single-command mode, retired before 1.0: it depends on counting
	// commands, so a plugin that adds one silently turns it off.
	const entries = Object.entries(commands);
	const [name, entry] = entries[0] ?? [];
	if (entries.length === 1 && entry && isCommand(entry)) {
		const path = [name as string];
		if (argv[0] === name) return { command: entry, path, remainingArgv: argv.slice(1) };
		warnImplicitMode();
		return { command: entry, path, remainingArgv: argv };
	}

	return resolveCommand(commands, argv);
}

let warnedImplicitMode = false;

function warnImplicitMode(): void {
	if (warnedImplicitMode) return;
	warnedImplicitMode = true;
	process.emitWarning('defineCLI() with a single command is deprecated. Use runCLI().', {
		type: 'DeprecationWarning',
		code: 'RUNA_IMPLICIT_SINGLE_COMMAND',
	});
}

function findRoute(commands: CommandTree, argv: string[], rootName?: string): Route {
	try {
		const { command, path } = resolveCommandFromTree(commands, argv, rootName);
		return { command, path, isIncomplete: false };
	} catch (err) {
		if (!(err instanceof RouteNotFoundError)) throw err;
		return { path: err.path, isIncomplete: err.isIncomplete, flag: err.flag };
	}
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Create a CLI from a configuration.
 * Returns a branded CLI object with a .run() method.
 */
export function defineCLI(config: CLIConfig): CLI {
	return {
		_type: 'runa:cli' as const,
		config,
		async run(argv?: string[]): Promise<void> {
			await enter(config, argv ?? process.argv.slice(2));
		},
	};
}

/**
 * Run a CLI made of one command. Accepts everything defineCLI() does except
 * meta and commands, which come from the command: plugins, middleware, config.
 */
export async function runCLI(command: Command, options: RunCLIOptions = {}): Promise<void> {
	const { argv = process.argv.slice(2), ...config } = options;
	const { name } = command.meta;

	// A CLI of one command has no key to name it (ADR-0043)
	if (!name) {
		console.error('runCLI needs meta.name: it is the name of the CLI.');
		process.exit(1);
	}

	await enter(rootConfig(command, name, config), argv, name);
}

/** What a CLI of one command is. Internal, shared with testCLI(). */
export function rootConfig(
	command: Command,
	name: string,
	config: Omit<CLIConfig, 'meta' | 'commands'>,
): CLIConfig {
	const { version, description } = command.meta;
	return { ...config, meta: { name, version, description }, commands: { [name]: command } };
}

/** Every CLI starts here: as itself, or as a tool if an MCP server launched it. */
async function enter(config: CLIConfig, argv: string[], rootName?: string): Promise<void> {
	const request = takeToolRequest();

	if (request?.kind === 'ping') {
		sendToolReport({ kind: 'pong' });
		return;
	}

	await runCLILifecycle(config, argv, {
		rootName,
		toolCall: request,
		report: request && ((report) => sendToolReport(report, request.maxResultBytes)),
	});
}

/**
 * Run a command from an object, through the same lifecycle as a CLI run.
 * Internal, for @runa-cmd/mcp: not exported from the package barrel.
 *
 * @param options.argv - Startup arguments, read for global options only
 */
export async function runToolCall(
	config: CLIConfig,
	call: ToolCall,
	options: { argv?: string[]; rootName?: string } = {},
): Promise<void> {
	await runCLILifecycle(config, options.argv ?? [], { rootName: options.rootName, toolCall: call });
}

/**
 * Run a CLI without ending the process.
 * Internal, for testCLI(): not exported from the package barrel.
 */
export async function runWithHarness(
	config: CLIConfig,
	argv: string[],
	rootName: string | undefined,
	harness: RunHarness,
): Promise<void> {
	await runCLILifecycle(config, argv, { rootName, harness });
}
