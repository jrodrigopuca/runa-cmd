/**
 * Unit tests for middleware (middleware.ts)
 *
 * Tests: defineMiddleware, onion model, next() chaining, short-circuit
 * References: Spec Section 6 — middleware scenarios
 */
import { describe, it, expect } from 'vitest'
import { defineMiddleware } from '../middleware.js'

describe('defineMiddleware', () => {
  it('creates a branded middleware object', () => {
    const mw = defineMiddleware(async ({ next }) => {
      await next()
    })

    expect(mw._type).toBe('runa:middleware')
    expect(typeof mw.handler).toBe('function')
  })

  it('stores the handler function', () => {
    const handler = async ({ next }: { next: () => Promise<void> }) => {
      await next()
    }
    const mw = defineMiddleware(handler)
    expect(mw.handler).toBe(handler)
  })
})

describe('middleware composition (integration)', () => {
  it('executes in onion model order', async () => {
    const order: string[] = []

    const mwA = defineMiddleware(async ({ next }) => {
      order.push('A:before')
      await next()
      order.push('A:after')
    })

    const mwB = defineMiddleware(async ({ next }) => {
      order.push('B:before')
      await next()
      order.push('B:after')
    })

    // Simulate middleware chain composition
    const innerFn = async () => {
      order.push('command')
    }

    // Compose: mwA wraps mwB wraps command
    let chain = innerFn
    for (const mw of [mwB, mwA]) {
      const nextFn = chain
      chain = () =>
        mw.handler({
          next: async () => { await nextFn() },
          globalOptions: {},
        })
    }

    await chain()

    expect(order).toEqual([
      'A:before',
      'B:before',
      'command',
      'B:after',
      'A:after',
    ])
  })

  it('short-circuits when next() is not called', async () => {
    const order: string[] = []

    const mwAuth = defineMiddleware(async () => {
      order.push('auth:reject')
      // Does NOT call next() — short-circuits
      throw new Error('unauthorized')
    })

    const innerFn = async () => {
      order.push('command')
    }

    const chain = () =>
      mwAuth.handler({
        next: innerFn,
        globalOptions: {},
      })

    await expect(chain()).rejects.toThrow('unauthorized')
    expect(order).toEqual(['auth:reject'])
    expect(order).not.toContain('command')
  })

  it('passes globalOptions to middleware', async () => {
    let receivedGlobals: Record<string, unknown> = {}

    const mw = defineMiddleware(async ({ next, globalOptions }) => {
      receivedGlobals = globalOptions
      await next()
    })

    await mw.handler({
      next: async () => {},
      globalOptions: { verbose: true, token: 'abc' },
    })

    expect(receivedGlobals).toEqual({ verbose: true, token: 'abc' })
  })
})
