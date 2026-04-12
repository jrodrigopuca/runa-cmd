/**
 * @runa-cmd/core — Public API
 *
 * This barrel re-exports the complete public surface of @runa-cmd/core.
 * Internal modules (schema-walker, parseargs-bridge, resolve, variadic) are NOT exported.
 */

// ─── Builder functions ──────────────────────────────────────
export { defineCommand } from './command.js'
export { defineCLI, runCLI } from './cli.js'
export { defineMiddleware } from './middleware.js'
export { definePlugin } from './plugin.js'

// ─── Error classes ──────────────────────────────────────────
export {
  RunaError,
  ValidationError,
  CommandNotFoundError,
  CommandError,
} from './errors.js'

// ─── Config utilities ───────────────────────────────────────
export { jsonLoader } from './config/loader.js'

// ─── Introspection ──────────────────────────────────────────
export { getSchema } from './introspect.js'

// ─── Types (type-only re-exports) ───────────────────────────
export type {
  // Builder input types
  CommandConfig,
  CLIConfig,
  CLIConfigOptions,

  // Metadata types
  CommandMeta,
  CLIMeta,
  OptionMeta,

  // Runtime types
  RunContext,
  RunReturn,

  // Inference helpers
  InferArgs,
  InferOptions,

  // Branded objects
  Command,
  CLI,
  CommandTree,

  // Plugin system
  PluginConfig,
  PluginMeta,
  PluginCapabilities,
  PluginAPI,

  // Middleware
  Middleware,
  MiddlewareFn,
  MiddlewareContext,

  // Lifecycle
  HookName,
  HookHandler,
  HookContext,

  // Config
  ConfigLoader,

  // Introspection
  CLISchema,
  CommandSchema,
  ArgSchema,
  OptionSchema,

  // Schema walker output (useful for advanced consumers)
  ParamMetadata,
  ParamType,
} from './types.js'

// ─── Runtime constants ──────────────────────────────────────
export { HOOK_NAMES, PARAM_TYPES } from './types.js'
