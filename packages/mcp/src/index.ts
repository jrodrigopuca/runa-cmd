/**
 * @runa-cmd/mcp — Public API
 *
 * Barrel re-exports for the MCP plugin package.
 */
export { ERROR_CLASSES, type ErrorClass, MCP_ERROR_CODES, type McpErrorCode } from './errors.js';
export { mcpPlugin } from './plugin.js';
export type { McpPluginOptions, ToolOptions } from './types.js';
