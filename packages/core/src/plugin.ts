/**
 * @runa-cmd/core — Plugin system
 *
 * definePlugin() — validate and return plugin config
 * Plugin host — resolve lazy imports, topological sort, setup/cleanup orchestration
 * Capability validation via PluginAPI proxy
 */
import type { ZodType } from 'zod';
import { RunaError } from './errors.js';
import type {
	CLISchema,
	Command,
	CommandTree,
	HookHandler,
	HookName,
	Middleware,
	OptionMeta,
	PluginAPI,
	PluginCapabilities,
	PluginConfig,
} from './types.js';

// ─── Public builder ─────────────────────────────────────────

/**
 * Validate and return a PluginConfig.
 * Passthrough with shape validation — ensures required fields exist.
 */
export function definePlugin(config: PluginConfig): PluginConfig {
	if (!config.meta?.name) {
		throw new RunaError('Plugin must have meta.name defined.', {
			code: 'INVALID_PLUGIN',
			exitCode: 1,
		});
	}
	if (typeof config.setup !== 'function') {
		throw new RunaError(`Plugin '${config.meta.name}' must have a setup() function.`, {
			code: 'INVALID_PLUGIN',
			exitCode: 1,
		});
	}
	return config;
}

// ─── Lazy import resolution ─────────────────────────────────

type PluginInput = PluginConfig | (() => Promise<{ default: PluginConfig }>);

/**
 * Resolve a list of plugin inputs (direct configs or lazy imports)
 * into resolved PluginConfig objects.
 */
export async function resolvePlugins(plugins: PluginInput[]): Promise<PluginConfig[]> {
	const resolved: PluginConfig[] = [];

	for (const plugin of plugins) {
		if (typeof plugin === 'function') {
			try {
				const mod = await plugin();
				if (!mod.default) {
					throw new RunaError('Lazy-loaded plugin module does not have a default export.', {
						code: 'PLUGIN_LOAD_ERROR',
						exitCode: 1,
					});
				}
				resolved.push(mod.default);
			} catch (err) {
				if (err instanceof RunaError) throw err;
				throw new RunaError(
					`Failed to load lazy plugin: ${err instanceof Error ? err.message : String(err)}`,
					{ code: 'PLUGIN_LOAD_ERROR', exitCode: 1 },
				);
			}
		} else {
			resolved.push(plugin);
		}
	}

	return resolved;
}

// ─── Topological sort (Kahn's algorithm) ────────────────────

/**
 * Sort plugins in dependency order using Kahn's algorithm.
 * Detects circular dependencies and missing dependencies.
 */
export function topologicalSort(plugins: PluginConfig[]): PluginConfig[] {
	// Build name → plugin map
	const byName = new Map<string, PluginConfig>();
	for (const plugin of plugins) {
		byName.set(plugin.meta.name, plugin);
	}

	// Build adjacency list and in-degree count
	// edge: dependency → dependent (dependency must come first)
	const inDegree = new Map<string, number>();
	const dependents = new Map<string, string[]>(); // dep → [things that depend on it]

	for (const plugin of plugins) {
		const name = plugin.meta.name;
		if (!inDegree.has(name)) inDegree.set(name, 0);
		if (!dependents.has(name)) dependents.set(name, []);

		for (const dep of plugin.meta.dependencies ?? []) {
			if (!byName.has(dep)) {
				throw new RunaError(`Plugin '${name}' depends on '${dep}', which is not registered.`, {
					code: 'PLUGIN_MISSING_DEPENDENCY',
					exitCode: 1,
				});
			}
			if (!dependents.has(dep)) dependents.set(dep, []);
			const depList = dependents.get(dep);
			if (depList) depList.push(name);
			inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
		}
	}

	// Kahn's: start with nodes that have no dependencies
	const queue: string[] = [];
	for (const [name, degree] of inDegree) {
		if (degree === 0) queue.push(name);
	}

	const sorted: PluginConfig[] = [];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		const plugin = byName.get(current);
		if (plugin) sorted.push(plugin);

		for (const dependent of dependents.get(current) ?? []) {
			const newDegree = (inDegree.get(dependent) ?? 1) - 1;
			inDegree.set(dependent, newDegree);
			if (newDegree === 0) {
				queue.push(dependent);
			}
		}
	}

	// If sorted doesn't include all plugins, there's a cycle
	if (sorted.length !== plugins.length) {
		const remaining = plugins
			.filter((p) => !sorted.includes(p))
			.map((p) => `'${p.meta.name}'`)
			.join(', ');
		throw new RunaError(`Circular dependency detected among plugins: ${remaining}.`, {
			code: 'PLUGIN_CIRCULAR_DEPENDENCY',
			exitCode: 1,
		});
	}

	return sorted;
}

// ─── Plugin API factory ─────────────────────────────────────

export interface PluginHostRefs {
	commands: CommandTree;
	globalOptions: Record<string, ZodType>;
	globalMeta: { options: Record<string, OptionMeta> };
	middleware: Middleware[];
	hookRegister: (name: HookName, handler: HookHandler) => void;
	getSchema: () => CLISchema;
	/**
	 * Registrant(s) per global option name, for collision attribution
	 * (design Decision 9). Statically-declared `config.globalOptions` are
	 * seeded with STATIC_GLOBAL_OPTION_SOURCE; `addGlobalOption` appends the
	 * registering plugin's name. More than one registrant = a collision that
	 * `validateOptionCollisions()` reports.
	 */
	globalOptionSources?: Map<string, string[]>;
}

/**
 * Create a PluginAPI for a specific plugin, enforcing capability checks.
 */
export function createPluginAPI(
	pluginName: string,
	capabilities: PluginCapabilities | undefined,
	refs: PluginHostRefs,
): PluginAPI {
	const caps = capabilities ?? {};

	return {
		addCommand(name: string, command: Command): void {
			if (!caps.addCommands) {
				throw new RunaError(
					`Plugin '${pluginName}' called addCommand() but did not declare addCommands capability.`,
					{ code: 'PLUGIN_CAPABILITY_VIOLATION', exitCode: 1 },
				);
			}
			refs.commands[name] = command;
		},

		addGlobalOption(name: string, schema: ZodType, meta?: OptionMeta): void {
			if (!caps.addGlobalOptions) {
				throw new RunaError(
					`Plugin '${pluginName}' called addGlobalOption() but did not declare addGlobalOptions capability.`,
					{ code: 'PLUGIN_CAPABILITY_VIOLATION', exitCode: 1 },
				);
			}
			refs.globalOptions[name] = schema;
			if (meta) {
				refs.globalMeta.options[name] = meta;
			}
			// Record the registrant for collision attribution (Decision 9).
			// A duplicate registration is NOT rejected here — the single
			// validation pass after setup reports it (order-independent).
			if (refs.globalOptionSources) {
				const registrants = refs.globalOptionSources.get(name);
				if (registrants) {
					registrants.push(pluginName);
				} else {
					refs.globalOptionSources.set(name, [pluginName]);
				}
			}
		},

		addMiddleware(middleware: Middleware): void {
			if (!caps.addMiddleware) {
				throw new RunaError(
					`Plugin '${pluginName}' called addMiddleware() but did not declare addMiddleware capability.`,
					{ code: 'PLUGIN_CAPABILITY_VIOLATION', exitCode: 1 },
				);
			}
			refs.middleware.push(middleware);
		},

		hook(name: HookName, handler: HookHandler): void {
			// No capability check for hooks — all plugins can hook
			refs.hookRegister(name, handler);
		},

		getSchema(): CLISchema {
			return refs.getSchema();
		},

		getCommands(): CommandTree {
			return refs.commands;
		},
	};
}

// ─── Setup orchestration ────────────────────────────────────

/**
 * Call setup(api) for each plugin in topological order.
 */
export async function runPluginSetup(plugins: PluginConfig[], refs: PluginHostRefs): Promise<void> {
	for (const plugin of plugins) {
		const api = createPluginAPI(plugin.meta.name, plugin.capabilities, refs);
		await plugin.setup(api);
	}
}

// ─── Option collision detection (Decision 9) ────────────────

/**
 * Sentinel registrant for global options declared statically in
 * `config.globalOptions` (as opposed to plugin-registered ones).
 */
export const STATIC_GLOBAL_OPTION_SOURCE = '<cli-config>';

/** Human label for a registrant in collision messages. */
function sourceLabel(registrant: string | undefined): string {
	return registrant === undefined || registrant === STATIC_GLOBAL_OPTION_SOURCE
		? 'declared in config.globalOptions'
		: `from plugin '${registrant}'`;
}

/** Render a token for messages: long names as `--name`, short chars as `-c`. */
function renderLong(name: string): string {
	return `--${name}`;
}
function renderShort(char: string): string {
	return `-${char}`;
}

/** Split OptionMeta aliases into long names (without `--`) and short chars (without `-`). */
function splitAliases(meta: OptionMeta | undefined): { longs: string[]; shorts: string[] } {
	const longs: string[] = [];
	const shorts: string[] = [];
	for (const alias of meta?.alias ?? []) {
		if (alias.startsWith('--')) {
			longs.push(alias.slice(2));
		} else if (alias.startsWith('-') && alias.length === 2) {
			shorts.push(alias.slice(1));
		}
	}
	return { longs, shorts };
}

function isCommandNode(value: Command | CommandTree): value is Command {
	return '_type' in value && value._type === 'runa:command';
}

/** Owner of a claimed token in the global option surface. */
interface GlobalTokenOwner {
	/** Canonical global option name. */
	canonical: string;
	/** Rendered token that claimed the slot (`--name` or `-c`). */
	token: string;
}

/**
 * Single validation pass over the full option surface (design Decision 9).
 * Called once per `cli.run()`, immediately after plugin setup — the earliest
 * point where plugin-registered globals AND plugin-added commands both exist.
 *
 * Detects, in deterministic order:
 * 1. Global-vs-global same-name registrations (two plugins, or config + plugin)
 * 2. Global-vs-global alias overlaps (name or alias claimed by two globals)
 * 3. Global-vs-command collisions (names + aliases, full nested command tree)
 *
 * Throws `RunaError` code `OPTION_COLLISION`, exit 1 (CLI-author defect, not a
 * usage error) on the FIRST collision found. This function is the ONLY place
 * the check lives — the proposal's rollback path (downgrade throw to
 * `console.warn`) is a one-line change here.
 */
export function validateOptionCollisions(
	commands: CommandTree,
	globalOptions: Record<string, ZodType>,
	globalMeta: { options: Record<string, OptionMeta> },
	sources?: Map<string, string[]>,
): void {
	// 1. Same global name registered more than once (config counts as a registrant).
	if (sources) {
		for (const [name, registrants] of sources) {
			if (registrants.length > 1) {
				const labels = registrants
					.map((r) => (r === STATIC_GLOBAL_OPTION_SOURCE ? 'the CLI config' : `plugin '${r}'`))
					.join(' and ');
				throw new RunaError(
					`Global option '${renderLong(name)}' is registered by both ${labels}.`,
					{ code: 'OPTION_COLLISION', exitCode: 1 },
				);
			}
		}
	}

	// 2. Build the global token surface; overlapping claims between two
	//    different globals throw here. Long names and short chars are
	//    separate namespaces (`--h` and `-h` are different tokens).
	const globalLong = new Map<string, GlobalTokenOwner>();
	const globalShort = new Map<string, GlobalTokenOwner>();

	const claim = (
		map: Map<string, GlobalTokenOwner>,
		key: string,
		owner: GlobalTokenOwner,
	): void => {
		const existing = map.get(key);
		if (existing && existing.canonical !== owner.canonical) {
			throw new RunaError(
				`Global option '${renderLong(owner.canonical)}' (${sourceLabel(sources?.get(owner.canonical)?.[0])}) ` +
					`collides with global option '${renderLong(existing.canonical)}' (${sourceLabel(sources?.get(existing.canonical)?.[0])}): ` +
					`both use '${owner.token}'.`,
				{ code: 'OPTION_COLLISION', exitCode: 1 },
			);
		}
		map.set(key, owner);
	};

	for (const name of Object.keys(globalOptions)) {
		claim(globalLong, name, { canonical: name, token: renderLong(name) });
		const { longs, shorts } = splitAliases(globalMeta.options[name]);
		for (const long of longs) {
			claim(globalLong, long, { canonical: name, token: renderLong(long) });
		}
		for (const short of shorts) {
			claim(globalShort, short, { canonical: name, token: renderShort(short) });
		}
	}

	if (globalLong.size === 0 && globalShort.size === 0) return;

	// 3. Walk the FULL command tree (including plugin-added commands and
	//    nested subcommands) comparing option names + aliases.
	const walk = (tree: CommandTree, path: string[]): void => {
		for (const [key, entry] of Object.entries(tree)) {
			if (!isCommandNode(entry)) {
				walk(entry, [...path, key]);
				continue;
			}

			const commandPath = [...path, key].join(' ');
			const optionMeta = entry.meta.options as Record<string, OptionMeta> | undefined;

			for (const optName of Object.keys(entry.options ?? {})) {
				const { longs, shorts } = splitAliases(optionMeta?.[optName]);

				const collide = (owner: GlobalTokenOwner): never => {
					const viaAlias =
						owner.token === renderLong(owner.canonical) && owner.token === renderLong(optName)
							? ''
							: ` Both use '${owner.token}'.`;
					throw new RunaError(
						`Global option '${renderLong(owner.canonical)}' (${sourceLabel(sources?.get(owner.canonical)?.[0])}) ` +
							`collides with option '${renderLong(optName)}' of command '${commandPath}'.${viaAlias}`,
						{ code: 'OPTION_COLLISION', exitCode: 1 },
					);
				};

				for (const long of [optName, ...longs]) {
					const owner = globalLong.get(long);
					if (owner) {
						// Re-render the token from the command's side when the
						// collision came through the command's long alias.
						collide(long === owner.canonical ? owner : { ...owner, token: renderLong(long) });
					}
				}
				for (const short of shorts) {
					const owner = globalShort.get(short);
					if (owner) collide(owner);
				}
			}
		}
	};

	walk(commands, []);
}

// ─── Cleanup orchestration ──────────────────────────────────

/**
 * Call cleanup() for each plugin in REVERSE topological order.
 * Each cleanup is wrapped in try/catch — failures don't prevent others from running.
 * Returns collected errors.
 */
export async function runPluginCleanup(plugins: PluginConfig[]): Promise<Error[]> {
	const errors: Error[] = [];

	// Reverse order: dependents clean up before dependencies
	const reversed = [...plugins].reverse();

	for (const plugin of reversed) {
		if (typeof plugin.cleanup === 'function') {
			try {
				await plugin.cleanup();
			} catch (err) {
				errors.push(err instanceof Error ? err : new Error(String(err)));
			}
		}
	}

	return errors;
}
