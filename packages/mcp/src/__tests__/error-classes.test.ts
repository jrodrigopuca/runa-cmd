/**
 * The class of a failed call and mcp's own error codes are contract
 * (VERSIONING.md, T-234): one list in code, the same list in the README.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ERROR_CLASSES, type ErrorClass, MCP_ERROR_CODES } from '../index.js';

const src = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(src, '..', 'README.md'), 'utf8');
const errors = readme.slice(readme.indexOf('### Errors'), readme.indexOf('### Cancellation'));

/** The first column of the rows of the table whose header starts with `header`. */
function firstColumn(header: string): string[] {
	const table = errors.slice(errors.indexOf(header));
	const rows = table
		.slice(0, table.search(/\n\n|$/))
		.split('\n')
		.slice(2);
	return rows.map((row) => /^\| `([^`]+)` \|/.exec(row)?.[1] as string);
}

const sources = readdirSync(src)
	.filter((name) => name.endsWith('.ts') && name !== 'errors.ts')
	.map((name) => readFileSync(join(src, name), 'utf8'));

describe.each([
	['ERROR_CLASSES', ERROR_CLASSES, '| `class` |'],
	['MCP_ERROR_CODES', MCP_ERROR_CODES, '| Code |'],
])('%s', (_name, constants, header) => {
	it('is the list the README shows, in the same order', () => {
		expect(firstColumn(header)).toEqual(Object.values(constants));
	});

	it('is the only place in src that writes one', () => {
		const literals = Object.values(constants).filter((value) =>
			sources.some((text) => text.includes(`'${value}'`)),
		);
		expect(literals).toEqual([]);
	});
});

it('ERROR_CLASSES names each class by its value', () => {
	for (const [key, value] of Object.entries(ERROR_CLASSES)) {
		expect(value).toBe(key.toLowerCase());
	}
	const found: ErrorClass = ERROR_CLASSES.CANCELLED;
	expect(found).toBe('cancelled');
});
