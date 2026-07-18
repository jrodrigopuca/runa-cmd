/**
 * Unit tests for parseArgs bridge (parse/parseargs-bridge.ts)
 *
 * Tests: generating util.parseArgs config from schema walker output
 * References: Spec Section 2 — parseArgs bridge scenarios
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildParseArgsConfig } from '../../parse/parseargs-bridge.js';
import { walkSchema } from '../../parse/schema-walker.js';

describe('buildParseArgsConfig', () => {
	it('maps boolean → type "boolean"', () => {
		const metadata = walkSchema({ verbose: z.boolean() });
		const { parseArgsConfig } = buildParseArgsConfig(metadata);
		expect(parseArgsConfig.options!['verbose']).toMatchObject({ type: 'boolean' });
	});

	it('maps string → type "string"', () => {
		const metadata = walkSchema({ name: z.string() });
		const { parseArgsConfig } = buildParseArgsConfig(metadata);
		expect(parseArgsConfig.options!['name']).toMatchObject({ type: 'string' });
	});

	it('maps number → type "string" (Zod handles coercion)', () => {
		const metadata = walkSchema({ replicas: z.number() });
		const { parseArgsConfig } = buildParseArgsConfig(metadata);
		expect(parseArgsConfig.options!['replicas']).toMatchObject({ type: 'string' });
	});

	it('maps enum → type "string"', () => {
		const metadata = walkSchema({ env: z.enum(['staging', 'prod']) });
		const { parseArgsConfig } = buildParseArgsConfig(metadata);
		expect(parseArgsConfig.options!['env']).toMatchObject({ type: 'string' });
	});

	it('extracts short alias from -v format', () => {
		const metadata = walkSchema({ verbose: z.boolean() });
		const { parseArgsConfig } = buildParseArgsConfig(metadata, {
			verbose: { alias: ['-v'] },
		});
		expect(parseArgsConfig.options!['verbose']).toMatchObject({
			type: 'boolean',
			short: 'v',
		});
	});

	it('handles long alias from --verbose format', () => {
		const metadata = walkSchema({ env: z.string() });
		const { parseArgsConfig, longAliasMap } = buildParseArgsConfig(metadata, {
			env: { alias: ['-e', '--environment'] },
		});

		// Short alias on the main option
		expect(parseArgsConfig.options!['env']).toMatchObject({
			type: 'string',
			short: 'e',
		});

		// Long alias registered separately
		expect(parseArgsConfig.options!['environment']).toMatchObject({
			type: 'string',
		});
		expect(longAliasMap['environment']).toBe('env');
	});

	it('sets allowPositionals based on hasArgs', () => {
		const metadata = walkSchema({ verbose: z.boolean() });

		const withArgs = buildParseArgsConfig(metadata, undefined, true);
		expect(withArgs.parseArgsConfig.allowPositionals).toBe(true);

		const withoutArgs = buildParseArgsConfig(metadata, undefined, false);
		expect(withoutArgs.parseArgsConfig.allowPositionals).toBe(false);

		const defaultBehavior = buildParseArgsConfig(metadata);
		expect(defaultBehavior.parseArgsConfig.allowPositionals).toBe(false);
	});

	it('sets strict to false', () => {
		const metadata = walkSchema({ name: z.string() });
		const { parseArgsConfig } = buildParseArgsConfig(metadata);
		expect(parseArgsConfig.strict).toBe(false);
	});

	it('generates correct config for mixed options', () => {
		const metadata = walkSchema({
			verbose: z.boolean(),
			env: z.enum(['staging', 'prod']),
			replicas: z.number(),
		});

		const { parseArgsConfig } = buildParseArgsConfig(
			metadata,
			{
				verbose: { alias: ['-v'] },
				env: { alias: ['-e'] },
			},
			false,
		);

		expect(parseArgsConfig.options!['verbose']).toMatchObject({
			type: 'boolean',
			short: 'v',
		});
		expect(parseArgsConfig.options!['env']).toMatchObject({
			type: 'string',
			short: 'e',
		});
		expect(parseArgsConfig.options!['replicas']).toMatchObject({ type: 'string' });
		expect(parseArgsConfig.allowPositionals).toBe(false);
	});

	it('sets boolean default in parseArgs config', () => {
		const metadata = walkSchema({ verbose: z.boolean().default(true) });
		const { parseArgsConfig } = buildParseArgsConfig(metadata);
		expect(parseArgsConfig.options!['verbose']).toMatchObject({
			type: 'boolean',
			default: true,
		});
	});

	describe('known-key sets (strict-options input contract)', () => {
		it('knownKeys contains canonical names, long aliases, and no-* for booleans', () => {
			const metadata = walkSchema({
				verbose: z.boolean(),
				env: z.string(),
				replicas: z.number(),
			});

			const { knownKeys } = buildParseArgsConfig(metadata, {
				verbose: { alias: ['-v'] },
				env: { alias: ['-e', '--environment'] },
			});

			expect(knownKeys).toEqual(
				new Set(['verbose', 'no-verbose', 'env', 'environment', 'replicas']),
			);
		});

		it('booleanKeys contains only canonical names of boolean options', () => {
			const metadata = walkSchema({
				verbose: z.boolean(),
				force: z.boolean().default(false),
				env: z.string(),
				replicas: z.number(),
			});

			const { booleanKeys } = buildParseArgsConfig(metadata, {
				verbose: { alias: ['-v', '--loud'] },
			});

			expect(booleanKeys).toEqual(new Set(['verbose', 'force']));
		});

		it('short aliases do not appear in knownKeys (parseArgs maps them to canonical)', () => {
			const metadata = walkSchema({ verbose: z.boolean() });
			const { knownKeys } = buildParseArgsConfig(metadata, {
				verbose: { alias: ['-v'] },
			});

			expect(knownKeys.has('v')).toBe(false);
			expect(knownKeys.has('verbose')).toBe(true);
		});

		it('empty metadata yields empty sets', () => {
			const { knownKeys, booleanKeys } = buildParseArgsConfig([]);
			expect(knownKeys.size).toBe(0);
			expect(booleanKeys.size).toBe(0);
		});

		it('existing outputs (parseArgsConfig, longAliasMap) are unchanged by the new sets', () => {
			const metadata = walkSchema({ env: z.string() });
			const { parseArgsConfig, longAliasMap } = buildParseArgsConfig(metadata, {
				env: { alias: ['-e', '--environment'] },
			});

			expect(parseArgsConfig.options!['env']).toMatchObject({ type: 'string', short: 'e' });
			expect(parseArgsConfig.options!['environment']).toMatchObject({ type: 'string' });
			expect(longAliasMap).toEqual({ environment: 'env' });
			expect(parseArgsConfig.strict).toBe(false);
			expect(parseArgsConfig.allowNegative).toBe(true);
		});
	});
});
