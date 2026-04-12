/**
 * Unit tests for variadic validation (parse/variadic.ts)
 *
 * Tests: isVariadic detection, validateVariadicArgs position checks
 * References: Spec Section 4 — variadic definition-time scenarios
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { isVariadic, validateVariadicArgs } from '../../parse/variadic.js'
import { RunaError } from '../../errors.js'

describe('isVariadic', () => {
  it('detects z.array() as variadic', () => {
    expect(isVariadic(z.array(z.string()))).toBe(true)
  })

  it('returns false for z.string()', () => {
    expect(isVariadic(z.string())).toBe(false)
  })

  it('returns false for z.number()', () => {
    expect(isVariadic(z.number())).toBe(false)
  })

  it('returns false for z.boolean()', () => {
    expect(isVariadic(z.boolean())).toBe(false)
  })

  it('returns false for z.enum()', () => {
    expect(isVariadic(z.enum(['a', 'b']))).toBe(false)
  })

  it('detects z.array().default([]) through wrapper', () => {
    expect(isVariadic(z.array(z.string()).default([]))).toBe(true)
  })

  it('detects z.array().optional() through wrapper', () => {
    expect(isVariadic(z.array(z.string()).optional())).toBe(true)
  })
})

describe('validateVariadicArgs', () => {
  it('passes when array is last positional', () => {
    expect(() =>
      validateVariadicArgs({
        dest: z.string(),
        files: z.array(z.string()),
      }),
    ).not.toThrow()
  })

  it('passes when no arrays exist', () => {
    expect(() =>
      validateVariadicArgs({
        source: z.string(),
        dest: z.string(),
      }),
    ).not.toThrow()
  })

  it('passes with empty args', () => {
    expect(() => validateVariadicArgs({})).not.toThrow()
  })

  it('throws when array is NOT in last position', () => {
    expect(() =>
      validateVariadicArgs({
        files: z.array(z.string()),
        dest: z.string(),
      }),
    ).toThrow(RunaError)

    try {
      validateVariadicArgs({
        files: z.array(z.string()),
        dest: z.string(),
      })
    } catch (err) {
      expect(err).toBeInstanceOf(RunaError)
      expect((err as RunaError).message).toContain('files')
      expect((err as RunaError).message).toContain('last')
      expect((err as RunaError).code).toBe('INVALID_VARIADIC_POSITION')
    }
  })

  it('throws when multiple arrays exist', () => {
    expect(() =>
      validateVariadicArgs({
        sources: z.array(z.string()),
        targets: z.array(z.string()),
      }),
    ).toThrow(RunaError)

    try {
      validateVariadicArgs({
        sources: z.array(z.string()),
        targets: z.array(z.string()),
      })
    } catch (err) {
      expect(err).toBeInstanceOf(RunaError)
      expect((err as RunaError).message).toContain('one variadic')
      expect((err as RunaError).code).toBe('INVALID_VARIADIC_ARGS')
    }
  })

  it('single array at last position with other args passes', () => {
    expect(() =>
      validateVariadicArgs({
        source: z.string(),
        dest: z.string(),
        files: z.array(z.string()),
      }),
    ).not.toThrow()
  })
})
