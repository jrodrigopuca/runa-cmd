/**
 * @runa-cmd/core — Error class hierarchy
 *
 * RunaError (base) → ValidationError | CommandNotFoundError | CommandError
 * POSIX-aligned exit codes: 2 (usage), 127 (not found), 1 (general).
 */
import type { z } from 'zod';
import { longFlag } from './flag-name.js';

type ZodIssue = z.core.$ZodIssue;

// V8-specific: captureStackTrace is not in the standard Error type
const captureStackTrace =
	// biome-ignore lint/complexity/noBannedTypes: V8's captureStackTrace expects Function for the constructor argument
	(Error as { captureStackTrace?: (target: object, ctor: Function) => void }).captureStackTrace;

// ─── RunaError ──────────────────────────────────────────────

/**
 * The base of every error Runa throws. Its message reaches stderr as written,
 * and the process exits with its exit code.
 */
export class RunaError extends Error {
	/** What happened, as a stable name: tell errors apart by it, not by the message */
	readonly code: string;
	/** The exit code the process ends with */
	readonly exitCode: number;

	constructor(message: string, options: { code: string; exitCode?: number; cause?: unknown }) {
		super(message, options.cause === undefined ? undefined : { cause: options.cause });
		this.name = 'RunaError';
		this.code = options.code;
		this.exitCode = options.exitCode ?? 1;

		if (captureStackTrace) {
			captureStackTrace(this, this.constructor);
		}
	}
}

// ─── ValidationError ────────────────────────────────────────

/** Prefixes the path, unless the message already names it as `<name>` or `--name`. */
function formatIssue(issue: ZodIssue): string {
	const name = String(issue.path[0]);
	const isNamed = issue.message.includes(`<${name}>`) || issue.message.includes(longFlag(name));
	if (issue.path.length === 0 || isNamed) return issue.message;
	return `${issue.path.join('.')}: ${issue.message}`;
}

/** An argument or option is missing or invalid: a usage error, with exit 2. */
export class ValidationError extends RunaError {
	/** One issue per value that failed, as Zod reports them */
	readonly issues: ZodIssue[];

	constructor(issues: ZodIssue[]) {
		const message = issues.map(formatIssue).join('\n');

		super(message, { code: 'VALIDATION_ERROR', exitCode: 2 });
		this.name = 'ValidationError';
		this.issues = issues;

		if (captureStackTrace) {
			captureStackTrace(this, this.constructor);
		}
	}
}

// ─── ConfigError ────────────────────────────────────────────

/**
 * The config file can't be used. Whoever wrote it can fix it, as with a bad
 * flag, but the hint to read --help wouldn't help: the message names the file.
 */
export class ConfigError extends RunaError {
	constructor(message: string) {
		super(message, { code: 'CONFIG_INVALID', exitCode: 2 });
		this.name = 'ConfigError';

		if (captureStackTrace) {
			captureStackTrace(this, this.constructor);
		}
	}
}

// ─── CommandNotFoundError ───────────────────────────────────

/** No command has that name: exit 127, as in a shell. */
export class CommandNotFoundError extends RunaError {
	/** The closest command name, if one is close enough to suggest */
	readonly suggestion?: string;

	constructor(commandName: string, suggestion?: string) {
		const message = suggestion
			? `Command not found: '${commandName}'. Did you mean '${suggestion}'?`
			: `Command not found: '${commandName}'.`;

		super(message, { code: 'COMMAND_NOT_FOUND', exitCode: 127 });
		this.name = 'CommandNotFoundError';
		this.suggestion = suggestion;

		if (captureStackTrace) {
			captureStackTrace(this, this.constructor);
		}
	}
}

// ─── CommandError ───────────────────────────────────────────

/**
 * A failure you throw from run(), for the people using your CLI and for a
 * model calling it as a tool: both read the message as you wrote it.
 * Default code: `COMMAND_ERROR`. Default exit code: 1.
 */
export class CommandError extends RunaError {
	constructor(message: string, options?: { code?: string; exitCode?: number }) {
		super(message, {
			code: options?.code ?? 'COMMAND_ERROR',
			exitCode: options?.exitCode ?? 1,
		});
		this.name = 'CommandError';

		if (captureStackTrace) {
			captureStackTrace(this, this.constructor);
		}
	}
}

// ─── ProcessExit (internal, not exported from the barrel) ───

/** process.exit() under testCLI(): it has to end the run, not the test. */
export class ProcessExit extends Error {
	constructor(readonly exitCode: number) {
		super(`process.exit(${exitCode})`);
		this.name = 'ProcessExit';
	}
}

// ─── Exit reason (internal, not exported from the barrel) ───

const DEBUG_HINT = 'Run with RUNA_DEBUG=1 for details.';

/** Whether RUNA_DEBUG asks for diagnostic details. */
export function isDebugEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	const value = env.RUNA_DEBUG;
	return Boolean(value) && value !== '0';
}

function debugDetails(error: Error): string[] {
	const details = [error.stack ?? error.name];
	if (error instanceof RunaError) details.push(`Code: ${error.code}`);
	if (error.cause !== undefined) {
		const cause = error.cause instanceof Error ? error.cause.stack : String(error.cause);
		details.push(`Caused by: ${cause}`);
	}
	return details;
}

/** The run was stopped from outside. Its exit code comes from what stopped it. */
export class InterruptedError extends RunaError {
	constructor(message: string) {
		super(message, { code: 'INTERRUPTED' });
		this.name = 'InterruptedError';
	}
}

const isExpectedFailure = (error: Error): boolean =>
	error instanceof RunaError && error.message.trim() !== '';

/** Whether the failure comes from how the CLI was called, not from running it. */
export function isUsageError(error: Error): boolean {
	return error instanceof ValidationError || error instanceof CommandNotFoundError;
}

/**
 * Why a run failed, never empty, with no advice attached. It is all an agent
 * needs: it cannot act on a hint meant for the person at the terminal.
 *
 * @param subject - The running command, or the CLI when none was resolved yet
 */
export function failureReason(error: Error, subject: string): string {
	if (isExpectedFailure(error)) return error.message;

	const message = error.message.trim();
	return message
		? `Unexpected error in '${subject}': ${message}`
		: `'${subject}' failed without an error message (${error.name}).`;
}

/**
 * The reason shown when a CLI exits on an error: never empty, so no failure
 * is silent. Typed errors were written for the person running the CLI and
 * appear as they are. Anything else is a defect in the CLI, so it names the
 * failing command and tells the developer how to see more.
 *
 * @param subject - The running command, or the CLI when none was resolved yet
 * @param helpCommand - What to run for help, only if this CLI actually has it
 */
export function describeFailure(
	error: Error,
	subject: string,
	debug: boolean,
	helpCommand?: string,
): string {
	const lines = [failureReason(error, subject)];
	if (isUsageError(error) && helpCommand) lines.push(`Run '${helpCommand} --help' for usage.`);
	if (debug) lines.push(...debugDetails(error));
	else if (!isExpectedFailure(error)) lines.push(DEBUG_HINT);
	return lines.join('\n');
}
