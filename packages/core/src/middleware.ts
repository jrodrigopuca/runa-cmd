/**
 * @runa-cmd/core — defineMiddleware()
 *
 * Simple wrapper that brands a MiddlewareFn into a Middleware object.
 * Middleware follows the Koa/Hono onion model with next().
 */
import type { MiddlewareFn, Middleware } from './types.js'

// ─── Public API ─────────────────────────────────────────────

/**
 * Create a branded Middleware from a handler function.
 *
 * Middleware handlers are async functions receiving { next, globalOptions }.
 * Call `await next()` to execute the next middleware or command.
 * Code before next() runs before the command; code after runs after.
 */
export function defineMiddleware(handler: MiddlewareFn): Middleware {
  return {
    _type: 'runa:middleware' as const,
    handler,
  }
}
