/**
 * @runa-cmd/core — Core type definitions
 *
 * All TypeScript types, interfaces, and type utilities for the Runa CLI framework.
 * This is a type-only module — no runtime code.
 */
import type { z, ZodType, ZodIssue } from 'zod'

// ─── Option Metadata ────────────────────────────────────────

export interface OptionMeta {
  /** CLI aliases, e.g. ['-e', '--environment'] */
  alias?: string[]
  /** Environment variable name, e.g. 'DEPLOY_ENV' */
  env?: string
  /** Help group name, e.g. 'Deploy' */
  group?: string
  /** Deprecation message, e.g. 'Use --confirm instead' */
  deprecated?: string
  /** Value hint for help, e.g. 'staging|prod' */
  hint?: string
}

// ─── Command Metadata ───────────────────────────────────────

export interface CommandMeta<
  TOptions extends Record<string, ZodType> = Record<string, ZodType>,
> {
  name: string
  description: string
  version?: string
  /** Option metadata — keys MUST be a subset of TOptions keys */
  options?: { [K in keyof TOptions]?: OptionMeta }
}

// ─── CLI Metadata ───────────────────────────────────────────

export interface CLIMeta {
  name: string
  version?: string
  description?: string
}

// ─── Inference Helpers ──────────────────────────────────────

/** Infer args types from a record of Zod schemas */
export type InferArgs<T extends Record<string, ZodType>> = {
  [K in keyof T]: z.infer<T[K]>
}

/** Infer options types from a record of Zod schemas */
export type InferOptions<T extends Record<string, ZodType>> = {
  [K in keyof T]: z.infer<T[K]>
}

// ─── Run Context ────────────────────────────────────────────

/** What the run() handler receives */
export interface RunContext<
  TArgs extends Record<string, ZodType> = Record<string, ZodType>,
  TOptions extends Record<string, ZodType> = Record<string, ZodType>,
> {
  args: InferArgs<TArgs>
  options: InferOptions<TOptions>
  globalOptions: Record<string, unknown>
  command: CommandMeta<TOptions>
  rawArgs: string[]
}

// ─── Conditional Return Type ────────────────────────────────

/**
 * If TOutput extends ZodType, run() must return data matching the schema.
 * If TOutput is undefined, run() returns void.
 */
export type RunReturn<TOutput> = TOutput extends ZodType
  ? z.infer<TOutput> | Promise<z.infer<TOutput>>
  : void | Promise<void>

// ─── Command Config (Builder Input) ────────────────────────

export interface CommandConfig<
  TArgs extends Record<string, ZodType> = Record<string, ZodType>,
  TOptions extends Record<string, ZodType> = Record<string, ZodType>,
  TOutput extends ZodType | undefined = undefined,
> {
  meta: CommandMeta<TOptions>
  args?: TArgs
  options?: TOptions
  output?: TOutput
  run: (ctx: RunContext<TArgs, TOptions>) => RunReturn<TOutput>
}

// ─── Command (Branded Runtime Object) ──────────────────────

export interface Command {
  readonly _type: 'runa:command'
  readonly meta: CommandMeta
  readonly args?: Record<string, ZodType>
  readonly options?: Record<string, ZodType>
  readonly output?: ZodType
  readonly run: (ctx: RunContext<any, any>) => unknown
}

// ─── Command Tree ───────────────────────────────────────────

export interface CommandTree {
  [key: string]: Command | CommandTree
}

// ─── CLI Config ─────────────────────────────────────────────

export interface CLIConfigOptions {
  /** Config file base name, e.g. 'mycli' → looks for mycli.config.* */
  name: string
  /** Additional config file loaders beyond built-in JSON */
  loaders?: ConfigLoader[]
  /** Directories to search for config files. Default: ['.', '~'] */
  searchPaths?: string[]
}

export interface CLIConfig {
  meta: CLIMeta
  commands: CommandTree
  plugins?: Array<PluginConfig | (() => Promise<{ default: PluginConfig }>)>
  middleware?: Middleware[]
  config?: CLIConfigOptions
  globalOptions?: Record<string, ZodType>
  globalMeta?: { options?: Record<string, OptionMeta> }
}

// ─── CLI (Branded Runtime Object) ───────────────────────────

export interface CLI {
  readonly _type: 'runa:cli'
  readonly config: CLIConfig
  run(argv?: string[]): Promise<void>
}

// ─── Plugin System ──────────────────────────────────────────

export interface PluginMeta {
  name: string
  version: string
  description?: string
  /** Names of other plugins this depends on */
  dependencies?: string[]
}

export interface PluginCapabilities {
  addCommands?: boolean
  addGlobalOptions?: boolean
  addMiddleware?: boolean
}

export interface PluginConfig {
  meta: PluginMeta
  capabilities?: PluginCapabilities
  setup: (api: PluginAPI) => void | Promise<void>
  cleanup?: () => void | Promise<void>
}

export interface PluginAPI {
  addCommand(name: string, command: Command): void
  addGlobalOption(name: string, schema: ZodType, meta?: OptionMeta): void
  addMiddleware(middleware: Middleware): void
  hook(name: HookName, handler: HookHandler): void
  getSchema(): CLISchema
}

// ─── Lifecycle Hooks ────────────────────────────────────────

export const HOOK_NAMES = {
  BEFORE_PARSE: 'beforeParse',
  ON_GLOBAL_FLAGS: 'onGlobalFlags',
  AFTER_PARSE: 'afterParse',
  BEFORE_RUN: 'beforeRun',
  AFTER_RUN: 'afterRun',
  ON_ERROR: 'onError',
  CLEANUP: 'cleanup',
} as const

export type HookName = (typeof HOOK_NAMES)[keyof typeof HOOK_NAMES]

export interface HookContext {
  cli: CLIMeta
  rawArgs: string[]
  globalOptions?: Record<string, unknown>
  command?: CommandMeta
  args?: Record<string, unknown>
  options?: Record<string, unknown>
  error?: Error
  /** Call this in onGlobalFlags to short-circuit the lifecycle */
  shortCircuit?: () => void
  /** Set this in onError to prevent default error output */
  handled?: boolean
}

export type HookHandler = (ctx: HookContext) => void | Promise<void>

// ─── Middleware ──────────────────────────────────────────────

export interface MiddlewareContext {
  next: () => Promise<void>
  globalOptions: Record<string, unknown>
}

export type MiddlewareFn = (ctx: MiddlewareContext) => Promise<void>

export interface Middleware {
  readonly _type: 'runa:middleware'
  readonly handler: MiddlewareFn
}

// ─── Config Loading ─────────────────────────────────────────

export interface ConfigLoader {
  /** File extensions this loader handles, e.g. ['.json'] */
  extensions: string[]
  /** Read and parse the config file at the given path */
  load(filePath: string): Promise<unknown>
}

// ─── Schema Introspection ───────────────────────────────────

export interface CLISchema {
  meta: CLIMeta
  commands: CommandSchema[]
  globalOptions: OptionSchema[]
}

export interface CommandSchema {
  name: string
  description: string
  /** Full command path, e.g. ['config', 'set'] for nested commands */
  fullPath: string[]
  args: ArgSchema[]
  options: OptionSchema[]
  hasOutput: boolean
  subcommands?: CommandSchema[]
}

export interface ArgSchema {
  name: string
  description?: string
  type: ParamType
  required: boolean
  defaultValue?: unknown
  isVariadic: boolean
  enumValues?: string[]
}

export interface OptionSchema {
  name: string
  description?: string
  type: ParamType
  required: boolean
  defaultValue?: unknown
  alias?: string[]
  env?: string
  group?: string
  deprecated?: string
  hint?: string
  enumValues?: string[]
}

// ─── Schema Walker Output ───────────────────────────────────

export const PARAM_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ENUM: 'enum',
  ARRAY: 'array',
} as const

export type ParamType = (typeof PARAM_TYPES)[keyof typeof PARAM_TYPES]

export interface ParamMetadata {
  /** Key name from the schema record */
  name: string
  /** Detected base type */
  zodType: ParamType
  /** Whether the field is optional (has .optional() or .default()) */
  isOptional: boolean
  /** Default value extracted from .default(), or undefined */
  defaultValue: unknown
  /** Whether this is a z.array() (variadic arg) */
  isArray: boolean
  /** Enum values extracted from z.enum() */
  enumValues?: string[]
  /** Description extracted from .describe() */
  description?: string
}
