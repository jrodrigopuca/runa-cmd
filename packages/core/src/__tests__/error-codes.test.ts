/**
 * Error codes are contract (VERSIONING.md, T-234): one list in code, the same
 * list in the README, and isRunaError() to read them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../command.js';
import {
	CommandError,
	CommandNotFoundError,
	ConfigError,
	ERROR_CODES,
	type ErrorCode,
	isRunaError,
	RunaError,
	ValidationError,
} from '../errors.js';
import { validateOptionNames } from '../plugin.js';

const src = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(src, '..', 'README.md'), 'utf8');

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
		return path.endsWith('.ts') ? [path] : [];
	});
}

/** The codes in the first column of the tables under "Error codes". */
function readmeCodes(): string[] {
	const start = readme.indexOf('#### Error codes');
	const section = readme.slice(start, readme.indexOf('\n### ', start));
	return [...section.matchAll(/^\| `([A-Z_]+)` \|/gm)].map((match) => match[1] as string);
}

const command = (options: Record<string, z.ZodType>) =>
	defineCommand({ meta: { description: 'Paint' }, options, run: () => {} });

const codeOf = (fn: () => void): string | undefined => {
	try {
		fn();
	} catch (error) {
		return (error as RunaError).code;
	}
	return undefined;
};

describe('ERROR_CODES', () => {
	it('names each code by its value', () => {
		for (const [key, value] of Object.entries(ERROR_CODES)) expect(value).toBe(key);
	});

	it('is the list the README shows, in the same order', () => {
		expect(readmeCodes()).toEqual(Object.values(ERROR_CODES));
	});

	it('is the only place in src that writes a code', () => {
		const literals = sourceFiles(src)
			.filter((path) => !path.endsWith('errors.ts'))
			.flatMap((path) => {
				const text = readFileSync(path, 'utf8');
				return Object.values(ERROR_CODES)
					.filter((code) => text.includes(`'${code}'`))
					.map((code) => `${relative(src, path)}: '${code}'`);
			});
		expect(literals).toEqual([]);
	});

	it('is what the error classes use', () => {
		expect(new ValidationError([]).code).toBe(ERROR_CODES.VALIDATION_ERROR);
		expect(new ConfigError('x').code).toBe(ERROR_CODES.INVALID_CONFIG);
		expect(new CommandNotFoundError('x').code).toBe(ERROR_CODES.COMMAND_NOT_FOUND);
		expect(new CommandError('x').code).toBe(ERROR_CODES.COMMAND_ERROR);
	});
});

describe('isRunaError', () => {
	it('recognizes a RunaError and its subclasses', () => {
		expect(isRunaError(new RunaError('x', { code: 'X' }))).toBe(true);
		expect(isRunaError(new ConfigError('x'))).toBe(true);
		expect(isRunaError(new CommandError('x'))).toBe(true);
	});

	it('checks the code when one is given', () => {
		const error = new ConfigError('x');
		expect(isRunaError(error, ERROR_CODES.INVALID_CONFIG)).toBe(true);
		expect(isRunaError(error, ERROR_CODES.VALIDATION_ERROR)).toBe(false);
	});

	it("takes the author's own codes", () => {
		const error = new CommandError('Production needs 2 replicas.', { code: 'TOO_FEW_REPLICAS' });
		expect(isRunaError(error, 'TOO_FEW_REPLICAS')).toBe(true);
	});

	it('is false for anything else', () => {
		const lookalike = Object.assign(new Error('x'), { code: 'INVALID_CONFIG', exitCode: 2 });
		for (const value of [lookalike, new Error('x'), 'INVALID_CONFIG', null, undefined, {}]) {
			expect(isRunaError(value)).toBe(false);
		}
	});

	it('recognizes an error from another copy of core, where instanceof fails', () => {
		// What a second copy's RunaError is: another class, with the same global mark
		class OtherCopyError extends Error {
			readonly code = 'INVALID_CONFIG';
			readonly exitCode = 2;
			[Symbol.for('@runa-cmd/core:RunaError')] = true;
		}
		const error = new OtherCopyError('x');

		expect(error instanceof RunaError).toBe(false);
		expect(isRunaError(error, ERROR_CODES.INVALID_CONFIG)).toBe(true);
	});

	it('narrows the type', () => {
		const error: unknown = new ConfigError('x');
		if (isRunaError(error)) {
			const code: string = error.code;
			const exitCode: number = error.exitCode;
			expect([code, exitCode]).toEqual(['INVALID_CONFIG', 2]);
		}
		const known: ErrorCode = ERROR_CODES.INTERRUPTED;
		expect(known).toBe('INTERRUPTED');
	});
});

describe('names that clash', () => {
	it('two keys for the same flag are an OPTION_COLLISION', () => {
		const paint = command({ darkColor: z.string(), 'dark-color': z.string() });
		expect(codeOf(() => validateOptionNames({ paint }, {}))).toBe(ERROR_CODES.OPTION_COLLISION);
	});

	it('a boolean that reads as a negation is an INVALID_OPTION_NAME', () => {
		const paint = command({ noCache: z.boolean() });
		expect(codeOf(() => validateOptionNames({ paint }, {}))).toBe(ERROR_CODES.INVALID_OPTION_NAME);
	});
});
