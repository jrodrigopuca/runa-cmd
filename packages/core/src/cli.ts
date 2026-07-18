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
import { CommandNotFoundError, RunaError } from './errors.js';
import { getSchema } from './introspect.js';
import { createHookRegistry } from './lifecycle.js';
import { buildParseArgsConfig } from './parse/parseargs-bridge.js';
import { resolveValues } from './parse/resolve.js';
import { walkSchema } from './parse/schema-walker.js';
import { assertKnownOptions } from './parse/strict.js';
import type { PluginHostRefs } from './plugin.js';
import { resolvePlugins, runPluginCleanup, runPluginSetup, topologicalSort } from './plugin.js';
import { findSuggestion } from './suggest.js';
import type {
	CLI,
	CLIConfig,
	Command,
	CommandTree,
	HookContext,
	Middleware,
	MiddlewareContext,
	OptionMeta,
	PluginConfig,
} from './types.js';

// ─── Command Resolution ─────────────────────────────────────

interface ResolvedCommand {
	command: Command;
	remainingArgv: string[];
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
				remainingArgv: tokens.slice(consumed),
			};
		}

		// It's a subtree — continue walking
		current = entry;
	}

	// If we're in a subtree and haven't found a command, check for a default/index command
	// For now, throw CommandNotFoundError

	const commandName = tokens[consumed] ?? tokens[consumed - 1] ?? '';
	const candidates = Object.keys(current);
	const suggestion = commandName ? findSuggestion(commandName, candidates) : undefined;

	if (!commandName && consumed === 0) {
		throw new CommandNotFoundError('(no command specified)', undefined);
	}

	throw new CommandNotFoundError(tokens.slice(0, consumed + 1).join(' '), suggestion);
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

// ─── CLI Execution Engine ───────────────────────────────────

/**
 * Run the full CLI lifecycle.
 */
async function runCLILifecycle(config: CLIConfig, argv: string[]): Promise<void> {
	// ─── State ─────────────────────────────────────────
	const hookRegistry = createHookRegistry();
	const mutableCommands: CommandTree = { ...config.commands };
	const mutableGlobalOptions: Record<string, ZodType> = { ...(config.globalOptions ?? {}) };
	const mutableGlobalMeta: { options: Record<string, OptionMeta> } = {
		options: { ...(config.globalMeta?.options ?? {}) },
	};
	const mutableMiddleware: Middleware[] = [...(config.middleware ?? [])];
	let sortedPlugins: PluginConfig[] = [];

	// Hook context that grows as we progress through the lifecycle
	const hookCtx: HookContext = {
		cli: config.meta,
		rawArgs: argv,
	};

	let lifecycleError: Error | undefined;
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
				getSchema: () =>
					getSchema(
						{ ...config, commands: mutableCommands },
						mutableGlobalOptions,
						mutableGlobalMeta.options,
					),
			};

			await runPluginSetup(sortedPlugins, pluginRefs);
		}

		// ─── beforeParse ──────────────────────────────────
		await hookRegistry.emit('beforeParse', hookCtx);
		// Handlers may have mutated hookCtx.rawArgs
		const currentArgv = hookCtx.rawArgs;

		// ─── Rest split (Decision 5) ──────────────────────
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
			});

			const { parsedOptions } = resolveValues({
				parseArgsResult: {
					values: globalParseResult.values as Record<string, unknown>,
					positionals: [],
				},
				longAliasMap,
				schemas: { options: mutableGlobalOptions },
				meta: { options: mutableGlobalMeta.options },
			});
			parsedGlobalOptions = parsedOptions;

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

		// ─── Resolve command ──────────────────────────────
		const commandArgv = hookCtx.rawArgs;
		const { command, remainingArgv } = resolveCommandFromTree(mutableCommands, commandArgv, config);

		hookCtx.command = command.meta;

		// ─── Parse command args + options ──────────────────
		const optionMetadata = command.options ? walkSchema(command.options) : [];

		const { parseArgsConfig, longAliasMap, knownKeys, booleanKeys } = buildParseArgsConfig(
			optionMetadata,
			command.meta.options as Record<string, OptionMeta> | undefined,
			!!command.args,
		);

		const cmdParseResult = parseArgs({
			...parseArgsConfig,
			args: remainingArgv,
		});

		// ─── Strict options check ─────────────────────────
		if (config.strictOptions !== false) {
			// Command canonical names + long aliases (= keys of the parseArgs config)
			const suggestionCandidates = Object.keys(parseArgsConfig.options ?? {});

			// Globals are extracted before command parsing, but their names must
			// still be known here: parseArgs maps a stray global short flag to its
			// bare character, and typo'd globals should suggest the global name.
			for (const name of Object.keys(mutableGlobalOptions)) {
				knownKeys.add(name);
				suggestionCandidates.push(name);
				for (const alias of mutableGlobalMeta.options[name]?.alias ?? []) {
					if (alias.startsWith('--')) {
						knownKeys.add(alias.slice(2));
						suggestionCandidates.push(alias.slice(2));
					} else if (alias.startsWith('-') && alias.length === 2) {
						knownKeys.add(alias.slice(1));
					}
				}
			}

			assertKnownOptions({
				producedKeys: Object.keys(cmdParseResult.values),
				knownKeys,
				booleanKeys,
				suggestionCandidates,
			});
		}

		// Load config values if configured
		let configValues: Record<string, unknown> | undefined;
		if (config.config) {
			configValues = await loadAndMergeConfig(config.config);
		}

		const { parsedArgs, parsedOptions } = resolveValues({
			parseArgsResult: {
				values: cmdParseResult.values as Record<string, unknown>,
				positionals: cmdParseResult.positionals,
			},
			longAliasMap,
			schemas: {
				args: command.args,
				options: command.options,
			},
			meta: { options: command.meta.options as Record<string, OptionMeta> | undefined },
			configValues,
		});

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
			rest,
		};

		const innerFn = async () => {
			commandResult = await command.run(runContext);

			// Validate output schema if present
			if (command.output) {
				command.output.parse(commandResult);
			}
		};

		const chain = composeMiddleware(mutableMiddleware, parsedGlobalOptions, innerFn);

		await chain();

		// ─── afterRun ─────────────────────────────────────
		await hookRegistry.emit('afterRun', hookCtx);
	} catch (err) {
		lifecycleError = err instanceof Error ? err : new Error(String(err));

		// ─── onError ──────────────────────────────────────
		hookCtx.error = lifecycleError;

		try {
			await hookRegistry.emit('onError', hookCtx);
		} catch {
			// onError handler threw — swallow it, cleanup still needs to run
		}

		// If error was not handled, fall back to default behavior
		if (!hookCtx.handled) {
			const exitCode = lifecycleError instanceof RunaError ? lifecycleError.exitCode : 1;
			console.error(lifecycleError.message);
			process.exit(exitCode);
		}
	} finally {
		// ─── cleanup (ALWAYS runs) ────────────────────────
		try {
			await hookRegistry.emit('cleanup', hookCtx);
		} catch {
			// Cleanup hook errors are swallowed
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
	}
}

/**
 * Resolve command with single-command mode support.
 * If there's exactly one command, route directly without requiring
 * the command name in argv.
 */
function resolveCommandFromTree(
	commands: CommandTree,
	argv: string[],
	_config: CLIConfig,
): ResolvedCommand {
	const commandEntries = Object.entries(commands);

	// Single-command mode: if exactly one command and first token doesn't match it,
	// route directly to that command
	if (commandEntries.length === 1) {
		const firstEntry = commandEntries[0];
		if (firstEntry) {
			const [name, entry] = firstEntry;
			if (isCommand(entry)) {
				// If argv is empty or first token doesn't match the command name
				if (argv.length === 0 || argv[0] !== name) {
					return { command: entry, remainingArgv: argv };
				}
				// First token matches — consume it
				return { command: entry, remainingArgv: argv.slice(1) };
			}
		}
	}

	// Multi-command mode: resolve from tree
	return resolveCommand(commands, argv);
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
			const effectiveArgv = argv ?? process.argv.slice(2);
			await runCLILifecycle(config, effectiveArgv);
		},
	};
}

/**
 * Single-command shorthand.
 * Wraps a command in defineCLI() and runs it.
 */
export async function runCLI(command: Command, argv?: string[]): Promise<void> {
	const cli = defineCLI({
		meta: { name: command.meta.name, description: command.meta.description },
		commands: { [command.meta.name]: command },
	});
	await cli.run(argv);
}
