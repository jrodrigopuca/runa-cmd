/**
 * @runa-cmd/core — Error class hierarchy
 *
 * RunaError (base) → ValidationError | CommandNotFoundError | CommandError
 * POSIX-aligned exit codes: 2 (usage), 127 (not found), 1 (general).
 */
import type { z } from 'zod';

type ZodIssue = z.core.$ZodIssue;

// V8-specific: captureStackTrace is not in the standard Error type
const captureStackTrace =
	// biome-ignore lint/complexity/noBannedTypes: V8's captureStackTrace expects Function for the constructor argument
	(Error as { captureStackTrace?: (target: object, ctor: Function) => void }).captureStackTrace;

// ─── RunaError ──────────────────────────────────────────────

export class RunaError extends Error {
	readonly code: string;
	readonly exitCode: number;

	constructor(message: string, options: { code: string; exitCode?: number }) {
		super(message);
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
	const name = String(issue.path.at(-1));
	const isNamed = issue.message.includes(`<${name}>`) || issue.message.includes(`--${name}`);
	if (issue.path.length === 0 || isNamed) return issue.message;
	return `${issue.path.join('.')}: ${issue.message}`;
}

export class ValidationError extends RunaError {
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

// ─── CommandNotFoundError ───────────────────────────────────

export class CommandNotFoundError extends RunaError {
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
