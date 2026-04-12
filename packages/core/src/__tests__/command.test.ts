/**
 * Unit tests for defineCommand (command.ts)
 *
 * Tests: command creation, variadic validation, meta.options key validation
 * References: Spec Section 1 — defineCommand() scenarios
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineCommand } from '../command.js'
import { RunaError } from '../errors.js'

describe('defineCommand', () => {
  it('creates a branded command object', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test command' },
      args: { name: z.string() },
      options: { loud: z.boolean().default(false) },
      run: () => {},
    })

    expect(cmd._type).toBe('runa:command')
    expect(cmd.meta.name).toBe('test')
    expect(cmd.meta.description).toBe('Test command')
    expect(cmd.args).toBeDefined()
    expect(cmd.options).toBeDefined()
    expect(typeof cmd.run).toBe('function')
  })

  it('creates command with no args', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test command' },
      options: { loud: z.boolean().default(false) },
      run: () => {},
    })

    expect(cmd._type).toBe('runa:command')
    expect(cmd.args).toBeUndefined()
    expect(cmd.options).toBeDefined()
  })

  it('creates command with no options', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test command' },
      args: { name: z.string() },
      run: () => {},
    })

    expect(cmd._type).toBe('runa:command')
    expect(cmd.args).toBeDefined()
    expect(cmd.options).toBeUndefined()
  })

  it('creates command with no args and no options', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test command' },
      run: () => {},
    })

    expect(cmd._type).toBe('runa:command')
    expect(cmd.args).toBeUndefined()
    expect(cmd.options).toBeUndefined()
  })

  it('creates command with output schema', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test command' },
      output: z.object({ url: z.string() }),
      run: () => ({ url: 'https://example.com' }),
    })

    expect(cmd.output).toBeDefined()
  })

  it('throws for variadic arg not in last position', () => {
    expect(() =>
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        args: { files: z.array(z.string()), dest: z.string() },
        run: () => {},
      }),
    ).toThrow(RunaError)
  })

  it('throws for multiple variadic args', () => {
    expect(() =>
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        args: {
          sources: z.array(z.string()),
          targets: z.array(z.string()),
        },
        run: () => {},
      }),
    ).toThrow(RunaError)
  })

  it('allows variadic arg in last position', () => {
    expect(() =>
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        args: {
          dest: z.string(),
          files: z.array(z.string()),
        },
        run: () => {},
      }),
    ).not.toThrow()
  })

  it('throws for meta.options key not in options', () => {
    expect(() =>
      defineCommand({
        meta: {
          name: 'test',
          description: 'Test',
          options: { nonExistent: { alias: ['-n'] } },
        } as any,
        options: { env: z.string() },
        run: () => {},
      }),
    ).toThrow(RunaError)
  })

  it('accepts valid meta.options keys', () => {
    expect(() =>
      defineCommand({
        meta: {
          name: 'test',
          description: 'Test',
          options: { env: { alias: ['-e'] } },
        },
        options: { env: z.string() },
        run: () => {},
      }),
    ).not.toThrow()
  })

  it('preserves the run function', () => {
    const runFn = () => {}
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test' },
      run: runFn,
    })
    expect(cmd.run).toBeDefined()
  })
})
