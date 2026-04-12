/**
 * @runa-cmd/core — defineCommand()
 *
 * Builder function that creates a typed, branded Command object from
 * a CommandConfig. Validates variadic args and meta.options keys at
 * definition time.
 */
import type { ZodType } from 'zod'
import type { CommandConfig, Command, CommandMeta, OptionMeta } from './types.js'
import { RunaError } from './errors.js'
import { validateVariadicArgs } from './parse/variadic.js'

// ─── Definition-time validation ─────────────────────────────

/**
 * Validate that keys in meta.options are a subset of the options schema keys.
 * This is a runtime complement to TypeScript's compile-time constraint.
 */
function validateMetaOptionsKeys<TOptions extends Record<string, ZodType>>(
  meta: CommandMeta<TOptions>,
  options?: TOptions,
): void {
  if (!meta.options) return

  const optionKeys = options ? new Set(Object.keys(options)) : new Set<string>()

  for (const key of Object.keys(meta.options)) {
    if (!optionKeys.has(key)) {
      throw new RunaError(
        `meta.options contains key '${key}' that is not defined in options. ` +
          `Available keys: ${optionKeys.size > 0 ? [...optionKeys].map((k) => `'${k}'`).join(', ') : '(none)'}.`,
        { code: 'INVALID_META_OPTIONS', exitCode: 1 },
      )
    }
  }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Create a typed Command from a CommandConfig.
 *
 * Validates at definition time:
 * - Variadic args (z.array()) must be the last positional arg
 * - meta.options keys must be a subset of options keys
 *
 * Returns a branded Command object with full generic inference preserved.
 */
export function defineCommand<
  TArgs extends Record<string, ZodType> = Record<string, ZodType>,
  TOptions extends Record<string, ZodType> = Record<string, ZodType>,
  TOutput extends ZodType | undefined = undefined,
>(config: CommandConfig<TArgs, TOptions, TOutput>): Command {
  // Validate variadic args at definition time
  if (config.args) {
    validateVariadicArgs(config.args as Record<string, ZodType>)
  }

  // Validate meta.options keys match options keys
  validateMetaOptionsKeys(config.meta, config.options)

  // Construct branded Command object
  return {
    _type: 'runa:command' as const,
    meta: config.meta as CommandMeta,
    args: config.args as Record<string, ZodType> | undefined,
    options: config.options as Record<string, ZodType> | undefined,
    output: config.output as ZodType | undefined,
    run: config.run as (ctx: any) => unknown,
  }
}
