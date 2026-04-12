/**
 * Unit tests for error hierarchy (errors.ts)
 *
 * Tests: RunaError, ValidationError, CommandNotFoundError, CommandError
 * References: Spec Section 7 — all error scenarios
 */
import { describe, expect, it } from 'vitest';
import { CommandError, CommandNotFoundError, RunaError, ValidationError } from '../errors.js';

describe('RunaError', () => {
	it('sets message, code, and exitCode', () => {
		const err = new RunaError('something failed', {
			code: 'SOMETHING_FAILED',
			exitCode: 1,
		});
		expect(err.message).toBe('something failed');
		expect(err.code).toBe('SOMETHING_FAILED');
		expect(err.exitCode).toBe(1);
	});

	it('defaults exitCode to 1', () => {
		const err = new RunaError('fail', { code: 'FAIL' });
		expect(err.exitCode).toBe(1);
	});

	it('sets name to RunaError', () => {
		const err = new RunaError('test', { code: 'TEST' });
		expect(err.name).toBe('RunaError');
	});

	it('is instanceof Error', () => {
		const err = new RunaError('test', { code: 'TEST' });
		expect(err).toBeInstanceOf(Error);
	});

	it('is instanceof RunaError', () => {
		const err = new RunaError('test', { code: 'TEST' });
		expect(err).toBeInstanceOf(RunaError);
	});

	it('has a stack trace', () => {
		const err = new RunaError('test', { code: 'TEST' });
		expect(err.stack).toBeDefined();
		expect(typeof err.stack).toBe('string');
	});
});

describe('ValidationError', () => {
	const issues = [
		{
			code: 'invalid_type' as const,
			expected: 'string' as const,
			message: 'Required',
			path: ['name'],
		},
	];

	it('has exitCode 2 (POSIX usage error)', () => {
		const err = new ValidationError(issues);
		expect(err.exitCode).toBe(2);
	});

	it('has code VALIDATION_ERROR', () => {
		const err = new ValidationError(issues);
		expect(err.code).toBe('VALIDATION_ERROR');
	});

	it('stores issues array', () => {
		const err = new ValidationError(issues);
		expect(err.issues).toEqual(issues);
	});

	it('generates message from issues', () => {
		const err = new ValidationError(issues);
		expect(err.message).toBe('name: Required');
	});

	it('generates multi-line message from multiple issues', () => {
		const multiIssues = [
			{ code: 'custom' as const, message: 'Missing name', path: ['name'] },
			{ code: 'custom' as const, message: 'Invalid value', path: ['env'] },
		];
		const err = new ValidationError(multiIssues);
		expect(err.message).toBe('name: Missing name\nenv: Invalid value');
	});

	it('handles issues with empty path', () => {
		const emptyPath = [{ code: 'custom' as const, message: 'Bad input', path: [] }];
		const err = new ValidationError(emptyPath);
		expect(err.message).toBe('Bad input');
	});

	it('is instanceof RunaError', () => {
		const err = new ValidationError(issues);
		expect(err).toBeInstanceOf(RunaError);
	});

	it('is instanceof Error', () => {
		const err = new ValidationError(issues);
		expect(err).toBeInstanceOf(Error);
	});

	it('is instanceof ValidationError', () => {
		const err = new ValidationError(issues);
		expect(err).toBeInstanceOf(ValidationError);
	});

	it('sets name to ValidationError', () => {
		const err = new ValidationError(issues);
		expect(err.name).toBe('ValidationError');
	});
});

describe('CommandNotFoundError', () => {
	it('has exitCode 127 (POSIX command not found)', () => {
		const err = new CommandNotFoundError('deploi');
		expect(err.exitCode).toBe(127);
	});

	it('has code COMMAND_NOT_FOUND', () => {
		const err = new CommandNotFoundError('deploi');
		expect(err.code).toBe('COMMAND_NOT_FOUND');
	});

	it('includes command name in message', () => {
		const err = new CommandNotFoundError('deploi');
		expect(err.message).toContain('deploi');
	});

	it('includes suggestion when provided', () => {
		const err = new CommandNotFoundError('deploi', 'deploy');
		expect(err.suggestion).toBe('deploy');
		expect(err.message).toContain('deploy');
		expect(err.message).toContain('Did you mean');
	});

	it('has no suggestion when not provided', () => {
		const err = new CommandNotFoundError('zzzzz');
		expect(err.suggestion).toBeUndefined();
	});

	it('is instanceof RunaError', () => {
		const err = new CommandNotFoundError('test');
		expect(err).toBeInstanceOf(RunaError);
	});

	it('is instanceof Error', () => {
		const err = new CommandNotFoundError('test');
		expect(err).toBeInstanceOf(Error);
	});

	it('sets name to CommandNotFoundError', () => {
		const err = new CommandNotFoundError('test');
		expect(err.name).toBe('CommandNotFoundError');
	});
});

describe('CommandError', () => {
	it('defaults exitCode to 1', () => {
		const err = new CommandError('failed');
		expect(err.exitCode).toBe(1);
	});

	it('defaults code to COMMAND_ERROR', () => {
		const err = new CommandError('failed');
		expect(err.code).toBe('COMMAND_ERROR');
	});

	it('accepts custom exitCode', () => {
		const err = new CommandError('env locked', { code: 'ENV_LOCKED', exitCode: 3 });
		expect(err.exitCode).toBe(3);
	});

	it('accepts custom code', () => {
		const err = new CommandError('env locked', { code: 'ENV_LOCKED' });
		expect(err.code).toBe('ENV_LOCKED');
	});

	it('is instanceof RunaError', () => {
		const err = new CommandError('test');
		expect(err).toBeInstanceOf(RunaError);
	});

	it('is instanceof Error', () => {
		const err = new CommandError('test');
		expect(err).toBeInstanceOf(Error);
	});

	it('is NOT instanceof ValidationError', () => {
		const err = new CommandError('test');
		expect(err).not.toBeInstanceOf(ValidationError);
	});

	it('sets name to CommandError', () => {
		const err = new CommandError('test');
		expect(err.name).toBe('CommandError');
	});
});
