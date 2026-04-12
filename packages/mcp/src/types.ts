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
}
