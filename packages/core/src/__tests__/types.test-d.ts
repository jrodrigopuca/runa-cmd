/**
 * Type-level tests for generic inference
 *
 * These tests use vitest's expectTypeOf to verify that TypeScript
 * infers the correct types from defineCommand() and related utilities.
 *
 * References: Spec Section 10 — type inference scenarios
 */
import { describe, it, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { defineCommand } from '../command.js'
import type {
  RunReturn,
  InferArgs,
  InferOptions,
  CommandConfig,
} from '../types.js'
import type { ZodType } from 'zod'

describe('type-level tests', () => {
  describe('defineCommand() inference', () => {
    it('infers string arg type', () => {
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        args: { name: z.string() },
        run: (ctx) => {
          expectTypeOf(ctx.args.name).toEqualTypeOf<string>()
        },
      })
    })

    it('infers number option type with default', () => {
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        options: { replicas: z.number().default(3) },
        run: (ctx) => {
          expectTypeOf(ctx.options.replicas).toEqualTypeOf<number>()
        },
      })
    })

    it('infers optional string type', () => {
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        options: { tag: z.string().optional() },
        run: (ctx) => {
          expectTypeOf(ctx.options.tag).toEqualTypeOf<string | undefined>()
        },
      })
    })

    it('infers enum type', () => {
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        options: { env: z.enum(['staging', 'prod']) },
        run: (ctx) => {
          expectTypeOf(ctx.options.env).toEqualTypeOf<'staging' | 'prod'>()
        },
      })
    })

    it('infers array type for variadic args', () => {
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        args: { files: z.array(z.string()) },
        run: (ctx) => {
          expectTypeOf(ctx.args.files).toEqualTypeOf<string[]>()
        },
      })
    })

    it('infers boolean type', () => {
      defineCommand({
        meta: { name: 'test', description: 'Test' },
        options: { verbose: z.boolean().default(false) },
        run: (ctx) => {
          expectTypeOf(ctx.options.verbose).toEqualTypeOf<boolean>()
        },
      })
    })
  })

  describe('RunReturn conditional type', () => {
    it('with output schema → must return matching type', () => {
      // Create a concrete schema instance for the type test
      const stringSchema = z.string()
      type WithOutput = RunReturn<typeof stringSchema>
      expectTypeOf<WithOutput>().toEqualTypeOf<string | Promise<string>>()
    })

    it('without output → void', () => {
      type WithoutOutput = RunReturn<undefined>
      expectTypeOf<WithoutOutput>().toEqualTypeOf<void | Promise<void>>()
    })
  })

  describe('InferArgs and InferOptions utility types', () => {
    it('InferArgs maps Zod schemas to inferred types', () => {
      // Use concrete schema instances — z.string/z.number are functions in Zod v4
      const schemas = {
        name: z.string(),
        age: z.number(),
      }
      type Args = InferArgs<typeof schemas>
      expectTypeOf<Args>().toEqualTypeOf<{ name: string; age: number }>()
    })

    it('InferOptions maps Zod schemas to inferred types', () => {
      const schemas = {
        env: z.enum(['staging', 'prod']),
        replicas: z.number(),
      }
      type Options = InferOptions<typeof schemas>
      expectTypeOf<Options>().toEqualTypeOf<{
        env: 'staging' | 'prod'
        replicas: number
      }>()
    })
  })

  describe('CommandMeta options key constraint', () => {
    it('meta.options keys constrained to TOptions keys', () => {
      // This should compile without errors — keys match
      defineCommand({
        meta: {
          name: 'test',
          description: 'Test',
          options: { env: { alias: ['-e'] } },
        },
        options: { env: z.string() },
        run: () => {},
      })

      // The following should be a type error if uncommented:
      // defineCommand({
      //   meta: {
      //     name: 'test',
      //     description: 'Test',
      //     options: { nonExistent: { alias: ['-n'] } },
      //   },
      //   options: { env: z.string() },
      //   run: () => {},
      // })
    })
  })
})
