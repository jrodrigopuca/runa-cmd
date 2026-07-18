/**
 * @runa-cmd/core — Public API
 *
 * This barrel re-exports the complete public surface of @runa-cmd/core.
 * Internal modules (schema-walker, parseargs-bridge, resolve, variadic) are NOT exported.
 */

export { defineCLI, runCLI } from './cli.js';
// ─── Builder functions ──────────────────────────────────────
export { defineCommand } from './command.js';
// ─── Config utilities ───────────────────────────────────────
export { jsonLoader } from './config/loader.js';
// ─── Error classes ──────────────────────────────────────────
export {
	CommandError,
	CommandNotFoundError,
	RunaError,
	ValidationError,
} from './errors.js';
// ─── Introspection ──────────────────────────────────────────
export { getSchema } from './introspect.js';
export { defineMiddleware } from './middleware.js';
// ─── Schema adapter (types only — selection stays internal, design D2) ──
export type { SchemaAdapter, SchemaDescription } from './parse/schema-adapter.js';
export { definePlugin } from './plugin.js';

// ─── Types (type-only re-exports) ───────────────────────────
export type {
	ArgSchema,
	CLI,
	CLIConfig,
	CLIConfigOptions,
	CLIMeta,
	// Introspection
	CLISchema,
	// Branded objects
	Command,
	// Builder input types
	CommandConfig,
	// Metadata types
	CommandMeta,
	CommandSchema,
	CommandTree,
	// Config
	ConfigLoader,
	HookContext,
	HookHandler,
	// Lifecycle
	HookName,
	// Inference helpers
	InferArgs,
	InferOptions,
	// Middleware
	Middleware,
	MiddlewareContext,
	MiddlewareFn,
	OptionMeta,
	OptionSchema,
	// Schema walker output (useful for advanced consumers)
	ParamMetadata,
	ParamType,
	PluginAPI,
	PluginCapabilities,
	// Plugin system
	PluginConfig,
	PluginMeta,
	// Runtime types
	RunContext,
	RunReturn,
} from './types.js';

// ─── Runtime constants ──────────────────────────────────────
export { HOOK_NAMES, PARAM_TYPES } from './types.js';
