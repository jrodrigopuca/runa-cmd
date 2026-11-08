/**
 * Type-level tests for generic inference
 *
 * These tests use vitest's expectTypeOf to verify that TypeScript
 * infers the correct types from defineCommand() and related utilities.
 */
import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../command.js';
import type { FormatContext, RunResult as PublicRunResult } from '../index.js';
import { definePlugin } from '../plugin.js';
import type { InferArgs, InferOptions, OptionMeta, PluginMeta, RunReturn } from '../types.js';

describe('type-level tests', () => {
	describe('public metadata', () => {
		it('a plugin only needs a name', () => {
			definePlugin({ meta: { name: 'minimal' }, setup() {} });
			expectTypeOf<PluginMeta['version']>().toEqualTypeOf<string | undefined>();
		});

		it('OptionMeta has no hint', () => {
			expectTypeOf<OptionMeta>().not.toHaveProperty('hint');
		});
	});

	describe('defineCommand() inference', () => {
		it('infers string arg type', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				args: { name: z.string() },
				run: (ctx) => {
					expectTypeOf(ctx.args.name).toEqualTypeOf<string>();
				},
			});
		});

		it('infers number option type with default', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				options: { replicas: z.number().default(3) },
				run: (ctx) => {
					expectTypeOf(ctx.options.replicas).toEqualTypeOf<number>();
				},
			});
		});

		it('infers optional string type', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				options: { tag: z.string().optional() },
				run: (ctx) => {
					expectTypeOf(ctx.options.tag).toEqualTypeOf<string | undefined>();
				},
			});
		});

		it('infers enum type', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				options: { env: z.enum(['staging', 'prod']) },
				run: (ctx) => {
					expectTypeOf(ctx.options.env).toEqualTypeOf<'staging' | 'prod'>();
				},
			});
		});

		it('infers array type for variadic args', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				args: { files: z.array(z.string()) },
				run: (ctx) => {
					expectTypeOf(ctx.args.files).toEqualTypeOf<string[]>();
				},
			});
		});

		it('infers boolean type', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				options: { verbose: z.boolean().default(false) },
				run: (ctx) => {
					expectTypeOf(ctx.options.verbose).toEqualTypeOf<boolean>();
				},
			});
		});
	});

	describe('RunReturn conditional type', () => {
		it('with output schema → must return matching type', () => {
			// Create a concrete schema instance for the type test
			const stringSchema = z.string();
			type WithOutput = RunReturn<typeof stringSchema>;
			expectTypeOf<WithOutput>().toEqualTypeOf<string | Promise<string>>();
		});

		it('without output → void', () => {
			type WithoutOutput = RunReturn<undefined>;
			expectTypeOf<WithoutOutput>().toEqualTypeOf<void | Promise<void>>();
		});
	});

	describe('what run() returns', () => {
		it('can return a value without an output schema', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				run: () => ({ ok: true }),
			});
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				run: () => 'text',
			});
		});

		it('gives format the type of what run() returns', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				run: () => ({ port: 1 }),
				format: (result) => {
					expectTypeOf(result).toEqualTypeOf<{ port: number }>();
					return String(result.port);
				},
			});
		});

		it('unwraps an async run()', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				run: async () => ({ port: 1 }),
				format: (result) => {
					expectTypeOf(result).toEqualTypeOf<{ port: number }>();
					return '';
				},
			});
		});

		it('gives format the output schema, if there is one', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				output: z.object({ url: z.string() }),
				run: () => ({ url: 'x' }),
				format: (result) => {
					expectTypeOf(result).toEqualTypeOf<{ url: string }>();
					return result.url;
				},
			});
		});

		it('still rejects what does not match the output schema', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				output: z.object({ url: z.string() }),
				// @ts-expect-error url must be a string
				run: () => ({ url: 1 }),
			});
		});

		it('gives format the options and args of the command, with their types', () => {
			defineCommand({
				meta: { description: 'Test' },
				args: { id: z.string() },
				options: { truncate: z.boolean().default(true) },
				run: () => ({ port: 1 }),
				format: (result, { args, options }) => {
					expectTypeOf(result).toEqualTypeOf<{ port: number }>();
					expectTypeOf(args.id).toEqualTypeOf<string>();
					expectTypeOf(options.truncate).toEqualTypeOf<boolean>();
					return '';
				},
			});
		});

		it('requires format to return text', () => {
			defineCommand({
				meta: { name: 'test', description: 'Test' },
				run: () => 1,
				// @ts-expect-error format returns a string
				format: () => 1,
			});
		});
	});

	describe('InferArgs and InferOptions utility types', () => {
		it('InferArgs maps Zod schemas to inferred types', () => {
			// Use concrete schema instances — z.string/z.number are functions in Zod v4
			const schemas = {
				name: z.string(),
				age: z.number(),
			};
			type Args = InferArgs<typeof schemas>;
			expectTypeOf<Args>().toEqualTypeOf<{ name: string; age: number }>();
		});

		it('InferOptions maps Zod schemas to inferred types', () => {
			const schemas = {
				env: z.enum(['staging', 'prod']),
				replicas: z.number(),
			};
			type Options = InferOptions<typeof schemas>;
			expectTypeOf<Options>().toEqualTypeOf<{
				env: 'staging' | 'prod';
				replicas: number;
			}>();
		});
	});

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
			});

			defineCommand({
				meta: {
					name: 'test',
					description: 'Test',
					// @ts-expect-error nonExistent is not an option of the command
					options: { nonExistent: { alias: ['-n'] } },
				},
				options: { env: z.string() },
				run: () => {},
			});
		});
	});

	// Without description, TypeScript gave a second error on run(), as if it
	// were what it returns: the defaults of a failed inference made it void (T-242)
	describe('a command without description', () => {
		it('has one error, the one that says description is missing', () => {
			defineCommand({
				// @ts-expect-error description is missing, and that's the only error
				meta: { name: 'greet' },
				args: { name: z.string() },
				run: ({ args }) => `Hello ${args.name}`,
			});
		});

		it('has one error with an async run() too', () => {
			defineCommand({
				// @ts-expect-error description is missing
				meta: {},
				run: async () => 42,
			});
		});

		it('still checks what run() returns against output', () => {
			defineCommand({
				meta: { description: 'Deploy' },
				output: z.object({ url: z.string() }),
				// @ts-expect-error url must be a string
				run: () => ({ url: 1 }),
			});
		});

		it('still types format with what run() returns', () => {
			defineCommand({
				meta: { description: 'Count' },
				run: () => ({ n: 1 }),
				format: (result) => {
					expectTypeOf(result).toEqualTypeOf<{ n: number }>();
					return String(result.n);
				},
			});
		});
	});

	// A format written apart from defineCommand needs to name both of its parameters
	describe('RunResult, from the package', () => {
		it('is the output schema type when the command declares one', () => {
			const output = z.object({ count: z.number() });
			expectTypeOf<PublicRunResult<typeof output, void>>().toEqualTypeOf<{ count: number }>();
		});

		it('is what run() returns when the command declares no output', () => {
			expectTypeOf<PublicRunResult<undefined, string[]>>().toEqualTypeOf<string[]>();
		});

		it('types a format written apart, as defineCommand expects it', () => {
			const output = z.object({ notes: z.array(z.string()) });
			const format = (result: PublicRunResult<typeof output, void>, _ctx: FormatContext) =>
				result.notes.join('\n');

			defineCommand({
				meta: { name: 'notes', description: 'List notes' },
				output,
				run: () => ({ notes: ['a'] }),
				format,
			});
		});
	});
});
