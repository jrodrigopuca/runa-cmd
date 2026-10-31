/**
 * @runa-cmd/mcp — Type definitions
 *
 * Plugin options for mcpPlugin().
 */

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
}
