/**
 * Integration tests for defineCommand() + full parsing pipeline
 *
 * Tests the end-to-end flow: defineCommand → schema-walker → parseArgs-bridge →
 * util.parseArgs → resolve → Zod validation
 *
 * References: Spec Section 1, 2, 3, 4 integration scenarios
 */

import { parseArgs } from 'node:util';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../../command.js';
import { ValidationError } from '../../errors.js';
import { buildParseArgsConfig } from '../../parse/parseargs-bridge.js';
import { resolveValues } from '../../parse/resolve.js';
import { walkSchema } from '../../parse/schema-walker.js';
import type { OptionMeta } from '../../types.js';

// ─── Helper: simulate full parsing pipeline ─────────────────

function simulateParsing(
	command: ReturnType<typeof defineCommand>,
	argv: string[],
	opts?: {
		env?: Record<string, string | undefined>;
		configValues?: Record<string, unknown>;
	},
): { parsedArgs: Record<string, unknown>; parsedOptions: Record<string, unknown> } {
	const optionMetadata = command.options ? walkSchema(command.options) : [];
	const { parseArgsConfig, longAliasMap } = buildParseArgsConfig(
		optionMetadata,
		command.meta.options as Record<string, OptionMeta> | undefined,
		!!command.args,
	);

	const result = parseArgs({ ...parseArgsConfig, args: argv });

	return resolveValues({
		parseArgsResult: {
			values: result.values as Record<string, unknown>,
			positionals: result.positionals,
		},
		longAliasMap,
		schemas: {
			args: command.args,
			options: command.options,
		},
		meta: { options: command.meta.options as Record<string, OptionMeta> | undefined },
		configValues: opts?.configValues,
		env: opts?.env ?? {},
	});
}

// ─── Tests ──────────────────────────────────────────────────

describe('defineCommand + parsing pipeline integration', () => {
	describe('basic args + options', () => {
		const deploy = defineCommand({
			meta: {
				name: 'deploy',
				description: 'Deploy the app',
				options: {
					env: { alias: ['-e', '--environment'], env: 'DEPLOY_ENV' },
					replicas: { alias: ['-r'] },
				},
			},
			args: { service: z.string() },
			options: {
				env: z.enum(['staging', 'prod']),
				replicas: z.number().default(3),
			},
			run: () => {},
		});

		it('parses args and options from argv', () => {
			const { parsedArgs, parsedOptions } = simulateParsing(deploy, [
				'my-service',
				'--env',
				'staging',
			]);

			expect(parsedArgs).toEqual({ service: 'my-service' });
			expect(parsedOptions).toEqual({ env: 'staging', replicas: 3 });
		});

		it('parses short alias', () => {
			const { parsedOptions } = simulateParsing(deploy, ['my-service', '-e', 'prod']);

			expect(parsedOptions.env).toBe('prod');
		});

		it('parses long alias', () => {
			const { parsedOptions } = simulateParsing(deploy, ['my-service', '--environment', 'staging']);

			expect(parsedOptions.env).toBe('staging');
		});

		it('uses Zod default when option not provided', () => {
			const { parsedOptions } = simulateParsing(deploy, ['my-service', '--env', 'staging']);

			expect(parsedOptions.replicas).toBe(3);
		});

		it('CLI arg overrides everything', () => {
			const { parsedOptions } = simulateParsing(
				deploy,
				['my-service', '--env', 'prod', '--replicas', '5'],
				{ env: { DEPLOY_ENV: 'staging' }, configValues: { env: 'staging', replicas: 1 } },
			);

			expect(parsedOptions.env).toBe('prod');
			expect(parsedOptions.replicas).toBe(5);
		});

		it('env var fills missing CLI arg', () => {
			const { parsedOptions } = simulateParsing(deploy, ['my-service'], {
				env: { DEPLOY_ENV: 'staging' },
			});

			expect(parsedOptions.env).toBe('staging');
		});

		it('config fills when both CLI and env are missing', () => {
			const { parsedOptions } = simulateParsing(deploy, ['my-service'], {
				configValues: { env: 'prod' },
			});

			expect(parsedOptions.env).toBe('prod');
		});

		it('number coercion from CLI string', () => {
			const { parsedOptions } = simulateParsing(deploy, [
				'my-service',
				'--env',
				'staging',
				'--replicas',
				'10',
			]);

			expect(parsedOptions.replicas).toBe(10);
			expect(typeof parsedOptions.replicas).toBe('number');
		});
	});

	describe('variadic args', () => {
		const copy = defineCommand({
			meta: { name: 'copy', description: 'Copy files' },
			args: {
				dest: z.string(),
				files: z.array(z.string()),
			},
			run: () => {},
		});

		it('collects remaining positionals into variadic arg', () => {
			const { parsedArgs } = simulateParsing(copy, ['/tmp', 'a.txt', 'b.txt', 'c.txt']);

			expect(parsedArgs.dest).toBe('/tmp');
			expect(parsedArgs.files).toEqual(['a.txt', 'b.txt', 'c.txt']);
		});

		it('variadic with no remaining args gives empty array', () => {
			const { parsedArgs } = simulateParsing(copy, ['/tmp']);

			expect(parsedArgs.dest).toBe('/tmp');
			expect(parsedArgs.files).toEqual([]);
		});
	});

	describe('boolean negation', () => {
		const cmd = defineCommand({
			meta: { name: 'test', description: 'Test' },
			options: {
				verbose: z.boolean().default(true),
			},
			run: () => {},
		});

		it('--no-verbose sets false', () => {
			const { parsedOptions } = simulateParsing(cmd, ['--no-verbose']);

			expect(parsedOptions.verbose).toBe(false);
		});

		it('--verbose sets true', () => {
			const { parsedOptions } = simulateParsing(cmd, ['--verbose']);

			expect(parsedOptions.verbose).toBe(true);
		});

		it('default used when no flag provided', () => {
			const { parsedOptions } = simulateParsing(cmd, []);

			expect(parsedOptions.verbose).toBe(true);
		});
	});

	describe('output schema validation', () => {
		it('valid output passes', async () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				output: z.object({ url: z.string() }),
				run: () => ({ url: 'https://example.com' }),
			});

			// Simulate running the command and validating output
			const result = cmd.run({
				args: {},
				options: {},
				globalOptions: {},
				command: cmd.meta,
				rawArgs: [],
				rest: [],
			});

			expect(cmd.output).toBeDefined();
			expect(() => cmd.output!.parse(result)).not.toThrow();
		});

		it('invalid output throws ZodError', () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				output: z.object({ url: z.string() }),
				run: () => ({ url: 123 }) as any,
			});

			const result = cmd.run({
				args: {},
				options: {},
				globalOptions: {},
				command: cmd.meta,
				rawArgs: [],
				rest: [],
			});

			expect(() => cmd.output!.parse(result)).toThrow();
		});
	});

	describe('validation errors', () => {
		it('missing required arg throws ValidationError', () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				args: { name: z.string() },
				run: () => {},
			});

			expect(() => simulateParsing(cmd, [])).toThrow(ValidationError);
		});

		it('invalid enum value throws ValidationError', () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				options: {
					env: z.enum(['staging', 'prod']),
				},
				run: () => {},
			});

			expect(() => simulateParsing(cmd, ['--env', 'invalid'])).toThrow(ValidationError);
		});

		it('extra positionals without variadic throws ValidationError', () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				args: { name: z.string() },
				run: () => {},
			});

			expect(() => simulateParsing(cmd, ['hello', 'extra'])).toThrow(ValidationError);
		});

		it('missing required option throws ValidationError', () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				options: { name: z.string() },
				run: () => {},
			});

			expect(() => simulateParsing(cmd, [])).toThrow(ValidationError);
		});
	});

	describe('env var coercion', () => {
		it('coerces env var string to number', () => {
			const cmd = defineCommand({
				meta: {
					name: 'test',
					description: 'Test',
					options: { port: { env: 'PORT' } },
				},
				options: { port: z.number().default(3000) },
				run: () => {},
			});

			const { parsedOptions } = simulateParsing(cmd, [], {
				env: { PORT: '8080' },
			});

			expect(parsedOptions.port).toBe(8080);
			expect(typeof parsedOptions.port).toBe('number');
		});
	});

	describe('command with no args and no options', () => {
		it('parses successfully with empty argv', () => {
			const cmd = defineCommand({
				meta: { name: 'test', description: 'Test' },
				run: () => {},
			});

			const { parsedArgs, parsedOptions } = simulateParsing(cmd, []);

			expect(parsedArgs).toEqual({});
			expect(parsedOptions).toEqual({});
		});
	});
});
