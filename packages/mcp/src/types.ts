/**
 * @runa-cmd/mcp — Type definitions
 *
 * Plugin options for mcpPlugin().
 */

/** What one tool leaves to the model. */
export interface ToolOptions {
	/** Options the model can set, even if they declare env or have a config value */
	expose?: string[];
	/** Options that must come from env or config: without a value, the server won't start */
	serverOnly?: string[];
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
	/** Per-tool settings, by tool name, e.g. `{ deploy: { serverOnly: ['token'] } }` */
	tools?: Record<string, ToolOptions>;
}
