/**
 * Unit tests for value resolution (parse/resolve.ts)
 *
 * Tests: merge priority, positional mapping, number coercion, env vars
 * References: Spec Section 3 (value resolution), Section 2 (positionals)
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../../errors.js';
import { coerceNumberValue, resolveValues } from '../../parse/resolve.js';

describe('resolveValues — positional mapping', () => {
	it('maps two positional args in order', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: ['/from', '/to'],
			},
			schemas: {
				args: { source: z.string(), destination: z.string() },
			},
		});
		expect(result.parsedArgs).toEqual({ source: '/from', destination: '/to' });
	});

	it('maps single positional arg', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: ['world'],
			},
			schemas: {
				args: { name: z.string() },
			},
		});
		expect(result.parsedArgs).toEqual({ name: 'world' });
	});

	it('throws ValidationError for missing required positional', () => {
		expect(() =>
			resolveValues({
				parseArgsResult: { values: {}, positionals: ['/from'] },
				schemas: {
					args: { source: z.string(), destination: z.string() },
				},
			}),
		).toThrow(ValidationError);
	});

	it('throws ValidationError for extra positionals without variadic', () => {
		expect(() =>
			resolveValues({
				parseArgsResult: {
					values: {},
					positionals: ['/from', '/to', '/extra'],
				},
				schemas: {
					args: { source: z.string(), destination: z.string() },
				},
			}),
		).toThrow(ValidationError);
	});

	it('collects remaining positionals into variadic arg', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: ['/target', 'file1.txt', 'file2.txt'],
			},
			schemas: {
				args: { dest: z.string(), files: z.array(z.string()) },
			},
		});
		expect(result.parsedArgs).toEqual({
			dest: '/target',
			files: ['file1.txt', 'file2.txt'],
		});
	});

	it('variadic with default empty array and no extra positionals', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: ['/target'],
			},
			schemas: {
				args: { dest: z.string(), files: z.array(z.string()).default([]) },
			},
		});
		expect(result.parsedArgs).toEqual({
			dest: '/target',
			files: [],
		});
	});

	it('returns empty args when no args schema defined', () => {
		const result = resolveValues({
			parseArgsResult: { values: {}, positionals: [] },
			schemas: {},
		});
		expect(result.parsedArgs).toEqual({});
	});
});

describe('resolveValues — options merge priority', () => {
	it('CLI arg overrides everything', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: { env: 'prod' },
				positionals: [],
			},
			schemas: {
				options: { env: z.enum(['staging', 'prod', 'development']) },
			},
			meta: { options: { env: { env: 'DEPLOY_ENV' } } },
			configValues: { env: 'development' },
			env: { DEPLOY_ENV: 'staging' },
		});
		expect(result.parsedOptions).toEqual({ env: 'prod' });
	});

	it('env var fills missing CLI arg', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: [],
			},
			schemas: {
				options: { env: z.enum(['staging', 'prod', 'development']) },
			},
			meta: { options: { env: { env: 'DEPLOY_ENV' } } },
			configValues: { env: 'development' },
			env: { DEPLOY_ENV: 'staging' },
		});
		expect(result.parsedOptions).toEqual({ env: 'staging' });
	});

	it('config value fills missing CLI arg and env', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: [],
			},
			schemas: {
				options: { replicas: z.number() },
			},
			meta: { options: { replicas: { env: 'REPLICAS' } } },
			configValues: { replicas: 5 },
			env: {},
		});
		expect(result.parsedOptions).toEqual({ replicas: 5 });
	});

	it('Zod default as final fallback', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: [],
			},
			schemas: {
				options: { replicas: z.number().default(3) },
			},
			env: {},
		});
		expect(result.parsedOptions).toEqual({ replicas: 3 });
	});

	it('missing required option → ValidationError', () => {
		expect(() =>
			resolveValues({
				parseArgsResult: { values: {}, positionals: [] },
				schemas: {
					options: { env: z.enum(['staging', 'prod']) },
				},
				env: {},
			}),
		).toThrow(ValidationError);
	});
});

describe('coerceNumberValue (task 2.8, design D7)', () => {
	it('returns empty string unchanged (declines to coerce)', () => {
		expect(coerceNumberValue('')).toBe('');
	});

	it('returns whitespace-only string unchanged', () => {
		expect(coerceNumberValue('  ')).toBe('  ');
	});

	it("coerces '8080' → 8080", () => {
		expect(coerceNumberValue('8080')).toBe(8080);
	});

	it("coerces '-1.5' → -1.5", () => {
		expect(coerceNumberValue('-1.5')).toBe(-1.5);
	});

	it("returns non-numeric string 'abc' unchanged (Zod rejects it)", () => {
		expect(coerceNumberValue('abc')).toBe('abc');
	});

	it('passes non-strings through untouched (number 0, undefined, boolean)', () => {
		expect(coerceNumberValue(0)).toBe(0);
		expect(coerceNumberValue(undefined)).toBeUndefined();
		expect(coerceNumberValue(true)).toBe(true);
	});
});

describe('resolveValues — number coercion', () => {
	it('pre-coerces string to number from CLI arg', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: { replicas: '5' },
				positionals: [],
			},
			schemas: {
				options: { replicas: z.number() },
			},
			env: {},
		});
		expect(result.parsedOptions).toEqual({ replicas: 5 });
	});

	it('pre-coerces string to number from env var', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: {},
				positionals: [],
			},
			schemas: {
				options: { replicas: z.number() },
			},
			meta: { options: { replicas: { env: 'REPLICAS' } } },
			env: { REPLICAS: '5' },
		});
		expect(result.parsedOptions).toEqual({ replicas: 5 });
	});
});

describe('resolveValues — long alias map', () => {
	it('resolves long alias to canonical name', () => {
		const result = resolveValues({
			parseArgsResult: {
				values: { environment: 'prod' },
				positionals: [],
			},
			longAliasMap: { environment: 'env' },
			schemas: {
				options: { env: z.enum(['staging', 'prod']) },
			},
			env: {},
		});
		expect(result.parsedOptions).toEqual({ env: 'prod' });
	});
});

describe('resolveValues — empty schemas', () => {
	it('returns empty when no options schema defined', () => {
		const result = resolveValues({
			parseArgsResult: { values: {}, positionals: [] },
			schemas: {},
			env: {},
		});
		expect(result.parsedOptions).toEqual({});
	});
});
