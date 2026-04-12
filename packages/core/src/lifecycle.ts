/**
 * @runa-cmd/core — Lifecycle hook registry + execution engine
 *
 * Manages the 7-hook pipeline:
 * beforeParse → onGlobalFlags → afterParse → beforeRun → afterRun → onError → cleanup
 *
 * Hooks are sequential arrays. Cleanup ALWAYS runs.
 */
import type { HookName, HookHandler, HookContext } from './types.js'

// ─── Hook Registry ──────────────────────────────────────────

export interface EmitResult {
  /** True if an onGlobalFlags handler called shortCircuit() */
  shortCircuited: boolean
}

export interface HookRegistry {
  /** Register a handler for a lifecycle hook */
  register(name: HookName, handler: HookHandler): void
  /** Emit a hook, running all handlers in registration order */
  emit(name: HookName, context: HookContext): Promise<EmitResult>
  /** Get all handlers for a hook (for testing/introspection) */
  getHandlers(name: HookName): HookHandler[]
}

/**
 * Create a new hook registry.
 * Handlers are stored per hook name and execute in registration order.
 */
export function createHookRegistry(): HookRegistry {
  const handlers = new Map<HookName, HookHandler[]>()

  return {
    register(name: HookName, handler: HookHandler): void {
      if (!handlers.has(name)) {
        handlers.set(name, [])
      }
      handlers.get(name)!.push(handler)
    },

    async emit(name: HookName, context: HookContext): Promise<EmitResult> {
      const hookHandlers = handlers.get(name) ?? []
      let shortCircuited = false

      if (name === 'onGlobalFlags') {
        // onGlobalFlags supports short-circuit via context.shortCircuit()
        let didShortCircuit = false
        const ctxWithShortCircuit: HookContext = {
          ...context,
          shortCircuit: () => {
            didShortCircuit = true
          },
        }

        for (const handler of hookHandlers) {
          await handler(ctxWithShortCircuit)
          if (didShortCircuit) {
            shortCircuited = true
            break
          }
        }
        return { shortCircuited }
      }

      if (name === 'cleanup') {
        // Cleanup handlers: each wrapped in try/catch, ALL must run
        for (const handler of hookHandlers) {
          try {
            await handler(context)
          } catch {
            // Cleanup errors are swallowed to ensure all handlers run.
            // Plugin cleanup errors are reported separately.
          }
        }
        return { shortCircuited: false }
      }

      // Standard hooks: run sequentially, propagate errors
      for (const handler of hookHandlers) {
        await handler(context)
      }

      return { shortCircuited: false }
    },

    getHandlers(name: HookName): HookHandler[] {
      return handlers.get(name) ?? []
    },
  }
}
