/**
 * @runa-cmd/mcp — Type definitions
 *
 * Plugin options for mcpPlugin().
 */
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

/** What the model can do with one tool, and how it is told about it. */
export interface ToolOptions {
	/** What the model reads about this tool, instead of the command's description */
	description?: string;
	/**
	 * Hints for the client, as MCP defines them, e.g. `{ destructiveHint: true }`.
	 * They are not access control: to keep a command from an agent, use `exclude`.
	 */
	annotations?: ToolAnnotations;
	/** Options the model can set, even if they declare env or have a config value */
	expose?: string[];
	/** Options that must come from env or config: without a value, the server won't start */
	serverOnly?: string[];
	/** Most bytes of output for this tool, instead of the plugin's `maxOutput` */
	maxOutput?: number;
}

/**
 * Options for mcpPlugin().
 */
export interface McpPluginOptions {
	/** Custom server name override (defaults to CLI meta.name) */
	name?: string;
	/** Custom server version override (defaults to CLI meta.version) */
	version?: string;
	/** Server instructions for cross-tool workflows */
	instructions?: string;
	/**
	 * How to start this CLI again: executable and arguments. Each tool call runs
	 * it as a child process. The default repeats how this process was started,
	 * and the server checks it before accepting calls. Set it if that check fails,
	 * e.g. `[process.execPath]` for a binary.
	 */
	selfCommand?: string[];
	/** Tools that won't exist for an agent, e.g. `['deploy', 'config_reset']` */
	exclude?: string[];
	/**
	 * Most bytes a tool can answer with. Longer output keeps its start and end,
	 * with a notice. A returned value isn't cut: over this limit, the call fails.
	 * Default: 100 KiB.
	 */
	maxOutput?: number;
	/** Per-tool settings, by tool name, e.g. `{ deploy: { serverOnly: ['token'] } }` */
	tools?: Record<string, ToolOptions>;
}
