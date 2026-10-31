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
import { loadAndMergeConfig } from './config/merge.js';
import {
	CommandNotFoundError,
	describeFailure,
	failureReason,
	isDebugEnabled,
	isUsageError,
	RunaError,
	ValidationError,
} from './errors.js';
import { flagName } from './flag-name.js';
import { commandClaims, findHelpTarget, HELP_TOKENS, renderHelp } from './help.js';
import { getSchema } from './introspect.js';
import { createHookRegistry } from './lifecycle.js';
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
import type {
	CLI,
	CLIConfig,
	CLISchema,
	Command,
	CommandTree,
	HookContext,
	Middleware,
	MiddlewareContext,
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
	) {
		super(name, suggestion);
	}
}

/** Where argv leads. Running a command and showing its help both start here. */
interface Route {
	command?: Command;
	path: string[];
	isIncomplete: boolean;
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

	const suggestion = findSuggestion(next, Object.keys(current));
	throw new RouteNotFoundError([...path, next].join(' '), suggestion, path, false);
}

// ─── Output Validation ──────────────────────────────────────

/** A command returning the wrong shape is an author defect, reported by field. */
const INVALID_OUTPUT = 'INVALID_OUTPUT';

function assertValidOutput(command: Command, output: ZodType, result: unknown): void {
	const parsed = output.safeParse(result);
	if (parsed.success) return;

	const issues = parsed.error.issues.map(
		(issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
	);
	throw new RunaError(
		`Command '${command.meta.name}' returned invalid output:\n${issues.join('\n')}`,
		{ code: INVALID_OUTPUT, exitCode: 1 },
	);
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
	parsedArgs: Record<string, unknown>;
	parsedOptions: Record<string, unknown>;
	rest: string[];
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
}

function loadConfigValues(config: CLIConfig): Promise<Record<string, unknown> | undefined> {
	return config.config ? loadAndMergeConfig(config.config) : Promise.resolve(undefined);
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

	// ─── Resolve command ──────────────────────────────
	const { command, remainingArgv } = resolveCommandFromTree(commands, commandArgv, rootName);

	hookCtx.command = command.meta;

	// ─── Parse command args + options ──────────────────
	const optionMetadata = command.options ? walkSchema(command.options) : [];

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

	const configValues = await loadConfigValues(config);
	const operands = distributeRest(cmdParseResult.positionals, rest, command.args ?? {});

	// Nothing reads what's left unless the command asked for it, so it can't stay
	// silent: as positionals, it gets the same error as any other extra (ADR-0036).
	const { parsedArgs, parsedOptions } = resolveValues({
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
	});

	reportDeprecations({
		provided: Object.keys(commandValues),
		longAliasMap,
		optionMeta: commandOptionMeta,
		configValues,
	});

	return { command, parsedArgs, parsedOptions, rest: operands.rest };
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
	const { config, commands, hookCtx } = scope;
	const command = commandAtPath(commands, call.path);
	hookCtx.command = command.meta;

	const commandOptionMeta = command.meta.options as Record<string, OptionMeta> | undefined;
	const configValues = await loadConfigValues(config);

	const { parsedArgs, parsedOptions } = resolveToolInput({
		input: call.input,
		schemas: { args: command.args, options: command.options },
		meta: { options: commandOptionMeta },
		configValues,
	});

	reportDeprecations({
		provided: Object.keys(call.input),
		longAliasMap: {},
		optionMeta: commandOptionMeta,
		configValues,
	});

	return { command, parsedArgs, parsedOptions, rest: [] };
}

// ─── CLI Execution Engine ───────────────────────────────────

interface LifecycleOptions {
	/** The command that runs without a subcommand (runCLI only) */
	rootName?: string;
	/** Run this call instead of reading the command from argv */
	toolCall?: ToolCall;
	/** Tells the process that started this one how the command went */
	report?: (report: ToolReport) => void;
}

/**
 * Run the full CLI lifecycle. Only selecting the command and its values depends
 * on the entry point: everything else is what any run goes through.
 */
async function runCLILifecycle(
	config: CLIConfig,
	argv: string[],
	{ rootName, toolCall, report }: LifecycleOptions = {},
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

	const stop = watchForStop(report !== undefined);

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
				getConfigValues: () => loadConfigValues(config),
				help,
				globalOptionSources,
			};

			await runPluginSetup(sortedPlugins, pluginRefs);
		}

		// ─── Option collision validation (ADR-0014) ─────
		// Post-plugin-setup is the earliest point where the full option
		// surface (plugin globals + plugin commands) exists. Runs before
		// any parsing on every invocation; throws RunaError OPTION_COLLISION.
		validateOptionNames(mutableCommands, mutableGlobalOptions);
		validateOptionCollisions(
			mutableCommands,
			mutableGlobalOptions,
			mutableGlobalMeta,
			globalOptionSources,
		);

		// ─── beforeParse ──────────────────────────────────
		await hookRegistry.emit('beforeParse', hookCtx);
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
			try {
				parsedGlobalOptions = resolveValues({
					parseArgsResult: { values: globalValues, positionals: [] },
					longAliasMap,
					schemas: { options: mutableGlobalOptions },
					meta: { options: mutableGlobalMeta.options },
				}).parsedOptions;
			} catch (err) {
				const isQuestion = answer === 'help' || answer === 'version';
				if (!isQuestion || !(err instanceof ValidationError)) throw err;
			}

			reportDeprecations({
				provided: Object.keys(globalValues),
				longAliasMap,
				optionMeta: mutableGlobalMeta.options,
			});

			// Pass remaining argv (command tokens only) to command parsing
			hookCtx.rawArgs = commandArgv;
		}

		hookCtx.globalOptions = parsedGlobalOptions;

		// ─── onGlobalFlags ────────────────────────────────
		const globalFlagsResult = await hookRegistry.emit('onGlobalFlags', hookCtx);
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
		};
		const selection = toolCall
			? await selectFromInput(scope, toolCall)
			: await selectFromArgv(scope, rest, rootName);
		if (!selection) return;

		const { command, parsedArgs, parsedOptions } = selection;

		hookCtx.args = parsedArgs;
		hookCtx.options = parsedOptions;

		// ─── afterParse ───────────────────────────────────
		await hookRegistry.emit('afterParse', hookCtx);

		// ─── beforeRun ────────────────────────────────────
		await hookRegistry.emit('beforeRun', hookCtx);

		// ─── Middleware chain + command execution ──────────
		const runContext = {
			args: parsedArgs,
			options: parsedOptions,
			globalOptions: parsedGlobalOptions,
			command: command.meta,
			rawArgs: argv,
			rest: selection.rest,
			signal: stop.signal,
		};

		const innerFn = async () => {
			report?.({ kind: 'running' });
			commandResult = await command.run(runContext);
			report?.({ kind: 'ran' });

			// Validate output schema if present
			if (command.output) {
				assertValidOutput(command, command.output, commandResult);
			}
			report?.({ kind: 'result', value: commandResult });
		};

		const chain = composeMiddleware(mutableMiddleware, parsedGlobalOptions, innerFn);

		await stop.guard(chain);

		// ─── afterRun ─────────────────────────────────────
		await hookRegistry.emit('afterRun', hookCtx);
	} catch (err) {
		lifecycleError = err instanceof Error ? err : new Error(err == null ? '' : String(err));

		// ─── onError ──────────────────────────────────────
		hookCtx.error = lifecycleError;

		try {
			await hookRegistry.emit('onError', hookCtx);
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
			const debug = isDebugEnabled();
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
		// ─── cleanup (ALWAYS runs) ────────────────────────
		try {
			await hookRegistry.emit('cleanup', hookCtx);
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
		if (exitCode !== undefined) {
			if (hookCtx.handled) {
				// A plugin that truly recovered keeps control by setting process.exitCode.
				process.exitCode ??= exitCode;
			} else {
				process.exit(exitCode);
			}
		}
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
		return { path: err.path, isIncomplete: err.isIncomplete };
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
	const { name, version, description } = command.meta;

	await enter(
		{ ...config, meta: { name, version, description }, commands: { [name]: command } },
		argv,
		name,
	);
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
