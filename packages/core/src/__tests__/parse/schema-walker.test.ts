/**
 * Unit tests for schema walker (parse/schema-walker.ts)
 *
 * Tests: walking Zod schemas to extract parameter metadata
 * References: Spec Section 2 — all schema walking scenarios
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { walkSchema, walkSingleSchema } from '../../parse/schema-walker.js';

describe('walkSchema', () => {
	it('walks z.string() → type string, required', () => {
		const result = walkSchema({ name: z.string() });
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			name: 'name',
			zodType: 'string',
			isOptional: false,
			defaultValue: undefined,
			isArray: false,
		});
	});

	it('extracts .describe() text', () => {
		const result = walkSchema({ name: z.string().describe('User name') });
		expect(result[0]!.description).toBe('User name');
	});

	it('walks z.boolean().default(false) → type boolean, optional, default false', () => {
		const result = walkSchema({
			verbose: z.boolean().default(false).describe('Enable verbose output'),
		});
		expect(result[0]).toMatchObject({
			name: 'verbose',
			zodType: 'boolean',
			isOptional: true,
			defaultValue: false,
			isArray: false,
			description: 'Enable verbose output',
		});
	});

	it('walks z.number().min(1).max(10).default(3) → type number, default 3', () => {
		const result = walkSchema({
			replicas: z.number().min(1).max(10).default(3),
		});
		expect(result[0]).toMatchObject({
			name: 'replicas',
			zodType: 'number',
			isOptional: true,
			defaultValue: 3,
		});
	});

	it('walks z.enum([...]) → type enum, values extracted', () => {
		const result = walkSchema({
			env: z.enum(['staging', 'prod']),
		});
		expect(result[0]).toMatchObject({
			name: 'env',
			zodType: 'enum',
			isOptional: false,
			enumValues: expect.arrayContaining(['staging', 'prod']),
		});
	});

	it('walks z.string().optional() → type string, optional', () => {
		const result = walkSchema({ tag: z.string().optional() });
		expect(result[0]).toMatchObject({
			name: 'tag',
			zodType: 'string',
			isOptional: true,
			defaultValue: undefined,
		});
	});

	it('walks z.array(z.string()) → type array, isArray true', () => {
		const result = walkSchema({ files: z.array(z.string()) });
		expect(result[0]).toMatchObject({
			name: 'files',
			zodType: 'array',
			isArray: true,
			isOptional: false,
		});
	});

	it('walks nested wrappers: z.number().optional().default(5)', () => {
		const result = walkSchema({
			count: z.number().optional().default(5),
		});
		expect(result[0]).toMatchObject({
			name: 'count',
			zodType: 'number',
			isOptional: true,
			defaultValue: 5,
		});
	});

	it('walks z.boolean().default(true)', () => {
		const result = walkSchema({
			verbose: z.boolean().default(true),
		});
		expect(result[0]).toMatchObject({
			name: 'verbose',
			zodType: 'boolean',
			isOptional: true,
			defaultValue: true,
		});
	});

	it('preserves insertion order for multiple schemas', () => {
		const result = walkSchema({
			alpha: z.string(),
			beta: z.number(),
			gamma: z.boolean(),
		});
		expect(result.map((r) => r.name)).toEqual(['alpha', 'beta', 'gamma']);
	});

	it('handles z.string().default("hello")', () => {
		const result = walkSchema({
			greeting: z.string().default('hello'),
		});
		expect(result[0]).toMatchObject({
			name: 'greeting',
			zodType: 'string',
			isOptional: true,
			defaultValue: 'hello',
		});
	});

	it('handles z.array with .default([])', () => {
		const result = walkSchema({
			files: z.array(z.string()).default([]),
		});
		expect(result[0]).toMatchObject({
			name: 'files',
			zodType: 'array',
			isArray: true,
			isOptional: true,
		});
	});

	it('extracts description from inner schema when wrapper has none', () => {
		const result = walkSchema({
			port: z.number().describe('Port number').optional(),
		});
		expect(result[0]!.description).toBe('Port number');
	});
});

describe('walkSingleSchema', () => {
	it('walks a single schema and returns metadata', () => {
		const result = walkSingleSchema('name', z.string().describe('A name'));
		expect(result).toMatchObject({
			name: 'name',
			zodType: 'string',
			isOptional: false,
			description: 'A name',
		});
	});
});
