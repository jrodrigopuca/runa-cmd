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
