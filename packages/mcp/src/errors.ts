/**
 * What a failed tool call reports in `_meta['runa/error']`, and the codes this
 * plugin throws at startup. Both are contract; the README lists when each one
 * comes up. Core's own codes are in `ERROR_CODES` from `@runa-cmd/core`.
 */

/** The `class` of a failed call: what failed. */
export const ERROR_CLASSES = {
	/** No tool has that name, or it's excluded */
	UNKNOWN_TOOL: 'unknown_tool',
	/** An argument or option the model sent is missing or breaks its schema */
	INVALID_INPUT: 'invalid_input',
	/** A value only the operator gives is missing, as an option's env var */
	NOT_CONFIGURED: 'not_configured',
	/** The call failed before run(), as in a hook or a middleware */
	REJECTED: 'rejected',
	/** The call ended well without running the command */
	NOT_RUN: 'not_run',
	/** run() threw a CommandError: the failure the author wrote */
	COMMAND_FAILED: 'command_failed',
	/** run() threw any other error, or the process ended without saying why */
	CRASHED: 'crashed',
	/** run() returned a value its output schema rejects */
	INVALID_OUTPUT: 'invalid_output',
	/** The result is over maxOutput */
	OUTPUT_TOO_LARGE: 'output_too_large',
	/** Something failed after run() returned */
	AFTER_RUN_FAILED: 'after_run_failed',
	/** The client cancelled the call, or the server closed */
	CANCELLED: 'cancelled',
} as const;

/** One of the classes of a failed call. */
export type ErrorClass = (typeof ERROR_CLASSES)[keyof typeof ERROR_CLASSES];

/** The codes mcpPlugin throws at startup, with exit 1. */
export const MCP_ERROR_CODES = {
	/** The tool settings can't be met */
	MCP_INVALID_TOOLS: 'MCP_INVALID_TOOLS',
	/** The CLI can't start itself as a subprocess */
	MCP_SELF_CHECK_FAILED: 'MCP_SELF_CHECK_FAILED',
} as const;

/** One of mcpPlugin's error codes. */
export type McpErrorCode = (typeof MCP_ERROR_CODES)[keyof typeof MCP_ERROR_CODES];
