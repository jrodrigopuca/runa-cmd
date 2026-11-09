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

// ─── Error codes ────────────────────────────────────────────

/**
 * Every code Runa's core throws. They're contract: tell errors apart by them,
 * with {@link isRunaError}. The README lists when each one comes up.
 */
export const ERROR_CODES = {
	// While someone runs the CLI
	/** An argument or option is missing, or breaks its schema. Exit 2 */
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	/** The config file can't be used: broken JSON, an unknown key. Exit 2 */
	INVALID_CONFIG: 'INVALID_CONFIG',
	/** No command has that name. Exit 127 */
	COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
	/** A CommandError without its own code. Exit 1 */
	COMMAND_ERROR: 'COMMAND_ERROR',
	/** SIGINT or SIGTERM stopped the run, and run() failed or didn't end in time */
	INTERRUPTED: 'INTERRUPTED',
	/** run() returned a value its output schema rejects. Exit 1 */
	INVALID_OUTPUT: 'INVALID_OUTPUT',
	/** The command declares format, and run() returned nothing. Exit 1 */
	MISSING_RESULT: 'MISSING_RESULT',
	/** A middleware returned without calling next(). Exit 1 */
	MIDDLEWARE_DID_NOT_CALL_NEXT: 'MIDDLEWARE_DID_NOT_CALL_NEXT',
	/** A middleware called next() without awaiting it. Exit 1 */
	MIDDLEWARE_DID_NOT_AWAIT_NEXT: 'MIDDLEWARE_DID_NOT_AWAIT_NEXT',

	// At startup, from the CLI's code. All exit 1
	/** Two options end up as the same flag or alias */
	OPTION_COLLISION: 'OPTION_COLLISION',
	/** A boolean `noCache` would clash with `--no-cache` */
	INVALID_OPTION_NAME: 'INVALID_OPTION_NAME',
	/** An alias isn't `-x` nor `--word`, as `'e'` or `'-ab'` */
	INVALID_OPTION_ALIAS: 'INVALID_OPTION_ALIAS',
	/** meta.options names a key that options doesn't have */
	INVALID_META_OPTIONS: 'INVALID_META_OPTIONS',
	/** A command has more than one list argument */
	INVALID_VARIADIC_ARGS: 'INVALID_VARIADIC_ARGS',
	/** The list argument isn't the last one */
	INVALID_VARIADIC_POSITION: 'INVALID_VARIADIC_POSITION',
	/** A command key isn't kebab-case, or doesn't match its meta.name */
	INVALID_COMMAND_NAME: 'INVALID_COMMAND_NAME',
	/** A command of defineCLI declares meta.version, which only runCLI reads */
	INVALID_COMMAND_VERSION: 'INVALID_COMMAND_VERSION',
	/** A global option and a command share a name */
	CONFIG_COLLISION: 'CONFIG_COLLISION',
	/** A plugin without meta.name or setup() */
	INVALID_PLUGIN: 'INVALID_PLUGIN',
	/** A lazy plugin failed to load, or has no default export */
	PLUGIN_LOAD_ERROR: 'PLUGIN_LOAD_ERROR',
	/** A plugin depends on one that isn't registered */
	PLUGIN_MISSING_DEPENDENCY: 'PLUGIN_MISSING_DEPENDENCY',
	/** Plugins depend on each other in a cycle */
	PLUGIN_CIRCULAR_DEPENDENCY: 'PLUGIN_CIRCULAR_DEPENDENCY',
	/** A plugin used part of the API without declaring its capability */
	PLUGIN_CAPABILITY_VIOLATION: 'PLUGIN_CAPABILITY_VIOLATION',
	/** Two plugins replace the help */
	HELP_ALREADY_REPLACED: 'HELP_ALREADY_REPLACED',
} as const;

/** One of Runa's error codes. */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Marks a RunaError. Symbol.for is global, so two copies of core installed
 * side by side mark their errors the same, and instanceof doesn't have to agree.
 */
const RUNA_ERROR = Symbol.for('@runa-cmd/core:RunaError');

/**
 * Whether `error` is a RunaError, and has `code` if you give one. Unlike
 * instanceof, it works when a plugin and the CLI each install their own core.
 *
 * @example
 * if (isRunaError(error, ERROR_CODES.INVALID_CONFIG)) { ... }
 * if (isRunaError(error, 'DEPLOY_FAILED')) { ... } // a CommandError's own code
 */
export function isRunaError(error: unknown, code?: ErrorCode | (string & {})): error is RunaError {
	if (!(error instanceof Error)) return false;
	const marked = error instanceof RunaError || RUNA_ERROR in error;
	return marked && (code === undefined || (error as RunaError).code === code);
}

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
		// Not enumerable: the mark isRunaError() reads stays out of logs and comparisons
		Object.defineProperty(this, RUNA_ERROR, { value: true });
		this.name = 'RunaError';
		this.code = options.code;
		this.exitCode = options.exitCode ?? 1;

		if (captureStackTrace) {
			captureStackTrace(this, this.constructor);
		}
	}
}

// ─── ValidationError ────────────────────────────────────────

/**
 * Prefixes the path, unless the message already names it: as `<name>` or
 * `--name` at a terminal, or as `'name'`, the key a tool call sends.
 */
function formatIssue(issue: ZodIssue): string {
	const name = String(issue.path[0]);
	const isNamed = [`<${name}>`, longFlag(name), `'${name}'`].some((form) =>
		issue.message.includes(form),
	);
	if (issue.path.length === 0 || isNamed) return issue.message;
	return `${issue.path.join('.')}: ${issue.message}`;
}

/** An argument or option is missing or invalid: a usage error, with exit 2. */
export class ValidationError extends RunaError {
	/** One issue per value that failed, as Zod reports them */
	readonly issues: ZodIssue[];

	constructor(issues: ZodIssue[]) {
		const message = issues.map(formatIssue).join('\n');

		super(message, { code: ERROR_CODES.VALIDATION_ERROR, exitCode: 2 });
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
		super(message, { code: ERROR_CODES.INVALID_CONFIG, exitCode: 2 });
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

		super(message, { code: ERROR_CODES.COMMAND_NOT_FOUND, exitCode: 127 });
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
			code: options?.code ?? ERROR_CODES.COMMAND_ERROR,
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
	if (isRunaError(error)) details.push(`Code: ${error.code}`);
	if (error.cause !== undefined) {
		const cause = error.cause instanceof Error ? error.cause.stack : String(error.cause);
		details.push(`Caused by: ${cause}`);
	}
	return details;
}

/** The run was stopped from outside. Its exit code comes from what stopped it. */
export class InterruptedError extends RunaError {
	constructor(message: string) {
		super(message, { code: ERROR_CODES.INTERRUPTED });
		this.name = 'InterruptedError';
	}
}

// By the mark, not instanceof: an error from another copy of core, as one a
// plugin brings, ends the same way (T-254)
const isExpectedFailure = (error: Error): boolean =>
	isRunaError(error) && error.message.trim() !== '';

/** Whether the failure comes from how the CLI was called, not from running it. */
export function isUsageError(error: Error): boolean {
	const usage = ['ValidationError', 'CommandNotFoundError'];
	return (
		error instanceof ValidationError ||
		error instanceof CommandNotFoundError ||
		(isRunaError(error) && usage.includes(error.name))
	);
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
