/**
 * Unit tests for the SchemaAdapter seam (parse/schema-adapter.ts) and its
 * Zod v4 implementation (parse/adapters/zod-v4.ts).
 *
 * Tests: describe() for every supported construct, wrapper unwrapping,
 * supports() probe, the "Ensure you are using Zod v4" guard, and the
 * internals-confinement meta-test (fs walk).
 * References: Spec 2.1 (all scenarios) — Design D1, D2.
 *
 * NOTE: the Zod-internals property name is built dynamically (INTERNALS_TOKEN)
 * so this file itself never contains the literal token the confinement
 * meta-test hunts for.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodV4Adapter } from '../../parse/adapters/zod-v4.js';
import { defaultAdapter } from '../../parse/schema-adapter.js';
import { walkSchema } from '../../parse/schema-walker.js';
import { isVariadic } from '../../parse/variadic.js';

/** The Zod-internals property name, assembled so it never appears literally here. */
const INTERNALS_TOKEN = ['_', 'zod'].join('');

describe('zodV4Adapter identity', () => {
	it('is named zod-v4', () => {
		expect(zodV4Adapter.name).toBe('zod-v4');
	});

	it('is the defaultAdapter (internal selection, design D2)', () => {
		expect(defaultAdapter).toBe(zodV4Adapter);
	});
});

describe('zodV4Adapter.describe() — base type kinds', () => {
	it('z.string() → kind string', () => {
		expect(zodV4Adapter.describe(z.string())).toEqual({
			kind: 'string',
			isOptional: false,
			hasDefault: false,
			defaultValue: undefined,
			enumValues: undefined,
			description: undefined,
		});
	});

	it('z.number() → kind number', () => {
		expect(zodV4Adapter.describe(z.number()).kind).toBe('number');
	});

	it('z.int() → kind number (int→number fallback)', () => {
		expect(zodV4Adapter.describe(z.int()).kind).toBe('number');
	});

	it('z.number().int() → kind number', () => {
		expect(zodV4Adapter.describe(z.number().int()).kind).toBe('number');
	});

	it('z.boolean() → kind boolean', () => {
		expect(zodV4Adapter.describe(z.boolean()).kind).toBe('boolean');
	});

	it('z.enum([...]) → kind enum with entries extracted as string[]', () => {
		const desc = zodV4Adapter.describe(z.enum(['staging', 'prod']));
		expect(desc.kind).toBe('enum');
		expect(desc.enumValues).toEqual(['staging', 'prod']);
	});

	it('z.array(z.string()) → kind array', () => {
		expect(zodV4Adapter.describe(z.array(z.string())).kind).toBe('array');
	});

	it('unknown base type (z.date()) falls back to string', () => {
		expect(zodV4Adapter.describe(z.date()).kind).toBe('string');
	});
});

describe('zodV4Adapter.describe() — wrapper unwrapping', () => {
	it('optional → isOptional true, no default', () => {
		const desc = zodV4Adapter.describe(z.string().optional());
		expect(desc).toMatchObject({ kind: 'string', isOptional: true, hasDefault: false });
		expect(desc.defaultValue).toBeUndefined();
	});

	it('default → isOptional true (optionality includes default), hasDefault + value', () => {
		const desc = zodV4Adapter.describe(z.number().default(8080));
		expect(desc).toMatchObject({
			kind: 'number',
			isOptional: true,
			hasDefault: true,
			defaultValue: 8080,
		});
	});

	it('nullable → unwrapped to base kind, NOT optional', () => {
		const desc = zodV4Adapter.describe(z.string().nullable());
		expect(desc).toMatchObject({ kind: 'string', isOptional: false, hasDefault: false });
	});

	it('nested wrappers: optional(default(nullable(enum))) → fully unwrapped', () => {
		const schema = z.enum(['a', 'b']).nullable().default('a').optional();
		const desc = zodV4Adapter.describe(schema);
		expect(desc).toMatchObject({
			kind: 'enum',
			isOptional: true,
			hasDefault: true,
			defaultValue: 'a',
		});
		expect(desc.enumValues).toEqual(['a', 'b']);
	});

	it('prefers the outermost description', () => {
		const schema = z.string().describe('inner').optional().describe('outer');
		expect(zodV4Adapter.describe(schema).description).toBe('outer');
	});

	it('surfaces an inner description through undescribed wrappers', () => {
		const schema = z.number().describe('Port number').optional();
		expect(zodV4Adapter.describe(schema).description).toBe('Port number');
	});
});

describe('spec 2.1 scenario: metadata extraction is unchanged', () => {
	it('z.number().optional().default(8080).describe(...) → exact ParamMetadata via walkSchema', () => {
		const schema = z.number().optional().default(8080).describe('Port to bind');
		const result = walkSchema({ port: schema });
		expect(result).toEqual([
			{
				name: 'port',
				zodType: 'number',
				isOptional: true,
				defaultValue: 8080,
				isArray: false,
				enumValues: undefined,
				description: 'Port to bind',
			},
		]);
	});
});

describe('spec 2.1 scenario: variadic detection through the adapter', () => {
	it('z.array(z.string()).optional() → isVariadic true', () => {
		expect(isVariadic(z.array(z.string()).optional())).toBe(true);
	});

	it('z.string() → isVariadic false', () => {
		expect(isVariadic(z.string())).toBe(false);
	});
});

describe('zodV4Adapter.supports()', () => {
	it('accepts a real Zod v4 schema', () => {
		expect(zodV4Adapter.supports(z.string())).toBe(true);
	});

	it.each([
		['plain object', {}],
		['null', null],
		['undefined', undefined],
		['string', 'z.string()'],
		['number', 42],
	])('rejects %s', (_label, value) => {
		expect(zodV4Adapter.supports(value)).toBe(false);
	});
});

describe('spec 2.1 scenario: unsupported schema object fails loudly', () => {
	it('plain object masquerading as a schema → "Ensure you are using Zod v4" error', () => {
		const fake = { description: 'not a schema' } as never;
		expect(() => zodV4Adapter.describe(fake)).toThrow(/Ensure you are using Zod v4/);
	});

	it('the guard also fires through walkSchema', () => {
		expect(() => walkSchema({ bogus: {} as never })).toThrow(/Ensure you are using Zod v4/);
	});
});

describe('spec 2.1 scenario: internals access is confined (meta-test)', () => {
	it(`"${INTERNALS_TOKEN}" appears only in parse/adapters/zod-v4.ts under packages/core/src`, () => {
		const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
		const entries = readdirSync(srcRoot, { recursive: true, encoding: 'utf8' });

		const offenders = entries
			.map((entry) => entry.replaceAll('\\', '/'))
			.filter((entry) => entry.endsWith('.ts'))
			.filter((entry) => readFileSync(join(srcRoot, entry), 'utf8').includes(INTERNALS_TOKEN));

		expect(offenders).toEqual(['parse/adapters/zod-v4.ts']);
	});
});
