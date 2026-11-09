/**
 * @runa-cmd/mcp — MCP server over a CLI run as subprocesses
 *
 * Uses the SDK's low-level Server: schemas are only described here, because
 * validating in the server would apply transforms and defaults that the child
 * applies again. The child owns validation, as in any run of the CLI.
 */

import { setImmediate } from 'node:timers/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	type CallToolResult,
	ListToolsRequestSchema,
	type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RunaError } from '@runa-cmd/core';
import type { ToolReport } from '@runa-cmd/core/internal';
import { type ZodType, z } from 'zod';
import { ERROR_CLASSES, type ErrorClass, MCP_ERROR_CODES } from './errors.js';
import { missingValues } from './operator.js';
import type { ChildOutcome, RunOptions } from './runner.js';
import { childrenFinished, runChild } from './runner.js';
import type { ToolRegistration } from './schema.js';

const SELF_CHECK_TIMEOUT_MS = 10_000;

// ─── Tool definitions ───────────────────────────────────────

function toJsonSchema(schema: ZodType): Record<string, unknown> {
	return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
}

/** MCP only allows objects as structured output. */
function structuredOutput(reg: ToolRegistration): ZodType | undefined {
	if (!reg.outputSchema) return undefined;
	return toJsonSchema(reg.outputSchema).type === 'object' ? reg.outputSchema : undefined;
}

export function toolDefinition(reg: ToolRegistration): Tool {
	const output = structuredOutput(reg);
	return {
		name: reg.name,
		description: reg.description,
		inputSchema: toJsonSchema(z.object(reg.inputShape)) as Tool['inputSchema'],
		...(output ? { outputSchema: toJsonSchema(output) as Tool['outputSchema'] } : {}),
		...(reg.annotations ? { annotations: reg.annotations } : {}),
	};
}

// ─── Results ────────────────────────────────────────────────

const success = (text: string): CallToolResult => ({ content: [{ type: 'text', text }] });

/** How far the command got: all Runa knows. What to do about it isn't Runa's call (ADR-0044). */
type Effect = 'none' | 'completed' | 'unknown';

interface ToolFailure {
	class: ErrorClass;
	effect: Effect;
}

const EFFECT_TEXT: Record<Effect, string> = {
	none: 'The command did not run.',
	completed: 'The command already ran.',
	unknown: 'The command did not finish.',
};

/**
 * The reports say how far the command got. Without one, a command may have done
 * anything: the safe reading of the unknown is never that nothing happened.
 */
function findFailure(
	{ reports, status, cancelled }: ChildOutcome,
	reg: ToolRegistration,
): ToolFailure | undefined {
	const reached = (kind: ToolReport['kind']) => reports.some((report) => report.kind === kind);
	const failed = reports.find((report) => report.kind === 'failed');

	const { AFTER_RUN_FAILED, CANCELLED, COMMAND_FAILED, CRASHED, INVALID_INPUT } = ERROR_CLASSES;
	const { INVALID_OUTPUT, NOT_CONFIGURED, NOT_RUN, OUTPUT_TOO_LARGE, REJECTED } = ERROR_CLASSES;

	if (cancelled) return { class: CANCELLED, effect: 'unknown' };
	if (reached('oversized')) return { class: OUTPUT_TOO_LARGE, effect: 'completed' };
	if (reached('result')) {
		if (!failed && status === 0) return undefined;
		return { class: AFTER_RUN_FAILED, effect: 'completed' };
	}
	if (reached('ran')) {
		const invalid = failed?.reason === 'output';
		return { class: invalid ? INVALID_OUTPUT : AFTER_RUN_FAILED, effect: 'completed' };
	}
	if (reached('running')) {
		// Only a CommandError is a failure the author wrote: anything else is a bug
		return { class: failed?.reason === 'command' ? COMMAND_FAILED : CRASHED, effect: 'unknown' };
	}
	if (failed?.reason === 'input') {
		// What the operator didn't set is what's missing first, whatever the model sent
		const configured = reg.unconfigured.length === 0;
		return { class: configured ? INVALID_INPUT : NOT_CONFIGURED, effect: 'none' };
	}
	if (failed) return { class: REJECTED, effect: 'none' };
	return { class: status === 0 ? NOT_RUN : CRASHED, effect: 'none' };
}

/** Anything the model has to read goes in the text: `_meta` is for the client. */
const failure = (reason: string, found: ToolFailure): CallToolResult => ({
	isError: true,
	// A failure the author threw says what it has to say: Runa can't add a fact to it
	content: [
		{
			type: 'text',
			text:
				found.class === ERROR_CLASSES.COMMAND_FAILED
					? reason
					: `${reason}\n\n${EFFECT_TEXT[found.effect]}`,
		},
	],
	_meta: { 'runa/error': found },
});

/** A call that sends options the operator fixed. It names them, never their values. */
function operatorSets(keys: string[]): CallToolResult {
	const names = keys.map((key) => `'${key}'`);
	const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
	const verb = names.length > 1 ? 'are' : 'is';
	const pronoun = names.length > 1 ? 'they' : 'it';
	return failure(
		`${list} ${verb} set by the operator of this server, so ${pronoun} can't be sent.`,
		{ class: ERROR_CLASSES.INVALID_INPUT, effect: 'none' },
	);
}

function failedChild(
	reg: ToolRegistration,
	outcome: ChildOutcome,
	found: ToolFailure,
): CallToolResult {
	const oversized = outcome.reports.find((report) => report.kind === 'oversized');
	if (oversized) {
		return failure(
			`Command '${reg.name}' returned ${oversized.bytes} bytes, over the limit of ${reg.maxOutput}.`,
			found,
		);
	}

	const written = outcome.stderr.trim();
	const printed = outcome.stdout.trim();
	const reason = written || printed || silentFailure(reg, outcome, found);
	if (found.class !== ERROR_CLASSES.NOT_CONFIGURED) return failure(reason, found);

	// The model reads this: it can't send the value, nor ask the user for it
	const note = `The operator of this server has to set ${missingValues(reg)}. It isn't a value you can send.`;
	return failure(`${note}\n\n${reason}`, found);
}

function silentFailure(reg: ToolRegistration, outcome: ChildOutcome, found: ToolFailure): string {
	if (found.class === ERROR_CLASSES.CANCELLED) return `Command '${reg.name}' was cancelled.`;
	if (outcome.status !== 0) return `Command '${reg.name}' exited with code ${outcome.status}.`;
	return `Command '${reg.name}' did not ${found.effect === 'none' ? 'run' : 'finish'}.`;
}

/**
 * Exit code 0 is not enough: a middleware can skip the command and a command
 * can exit on its own. Only the reports say how far it got.
 */
export function toToolResult(reg: ToolRegistration, outcome: ChildOutcome): CallToolResult {
	const found = findFailure(outcome, reg);
	if (found) return failedChild(reg, outcome, found);

	const finished = outcome.reports.find((report) => report.kind === 'result');
	const stdout = outcome.stdout.trim();

	// What run() returned is the author's choice, so it goes as it is.
	const value = finished?.value;
	if (value === undefined || value === null) {
		return success(stdout || `Command '${reg.name}' executed successfully.`);
	}

	const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
	return structuredOutput(reg)
		? { ...success(text), structuredContent: value as Record<string, unknown> }
		: success(text);
}

// ─── Server ─────────────────────────────────────────────────

export interface ServeOptions extends RunOptions {
	name: string;
	version: string;
	instructions?: string;
}

/** Fails at startup, with a way out, instead of on the first tool call. */
async function assertCanRunItself(options: RunOptions): Promise<void> {
	const { reports } = await runChild(
		{ kind: 'ping' },
		{ ...options, signal: AbortSignal.timeout(SELF_CHECK_TIMEOUT_MS) },
	);
	if (reports.some((report) => report.kind === 'pong')) return;

	throw new RunaError(
		`Cannot run this CLI as a subprocess with: ${options.selfCommand.join(' ')}. ` +
			'If it is a compiled binary, set mcpPlugin({ selfCommand }).',
		{ code: MCP_ERROR_CODES.MCP_SELF_CHECK_FAILED },
	);
}

export function createMcpServer(registrations: ToolRegistration[], options: ServeOptions): Server {
	const server = new Server(
		{ name: options.name, version: options.version },
		{ capabilities: { tools: {} }, instructions: options.instructions },
	);

	server.setRequestHandler(ListToolsRequestSchema, () => ({
		tools: registrations.map(toolDefinition),
	}));

	server.setRequestHandler(CallToolRequestSchema, async ({ params }, extra) => {
		const reg = registrations.find((candidate) => candidate.name === params.name);
		if (!reg) {
			return failure(`Unknown tool: ${params.name}`, {
				class: ERROR_CLASSES.UNKNOWN_TOOL,
				effect: 'none',
			});
		}

		// The operator's value wins, and the model has to know its own isn't used:
		// running with another value and answering success told it otherwise (ADR-0049)
		const input = params.arguments ?? {};
		const fixed = Object.keys(input).filter((key) => reg.fixed.has(key));
		if (fixed.length > 0) return operatorSets(fixed);

		const outcome = await runChild(
			{ kind: 'call', path: reg.path, input, maxResultBytes: reg.maxOutput },
			{
				...options,
				signal: options.signal ? AbortSignal.any([extra.signal, options.signal]) : extra.signal,
				maxOutput: reg.maxOutput,
				redactions: reg.redactions,
			},
		);
		return toToolResult(reg, outcome);
	});

	return server;
}

/**
 * Serve until the client disconnects or the process is told to stop, so the
 * lifecycle of the CLI, cleanup included, ends when the server does.
 */
export async function serve(
	registrations: ToolRegistration[],
	options: ServeOptions,
): Promise<void> {
	await assertCanRunItself(options);

	const stopping = new AbortController();
	const server = createMcpServer(registrations, { ...options, signal: stopping.signal });
	const closed = new Promise<void>((resolve) => {
		server.onclose = resolve;
	});

	// Calls in flight end first: closing would leave their answers with no way out
	const close = async () => {
		stopping.abort();
		await childrenFinished();
		await setImmediate(); // Each answer is a few promises away from the child's end
		await server.close();
	};
	process.once('SIGINT', close);
	process.once('SIGTERM', close);
	process.stdin.once('end', close);
	process.stdout.on('error', () => {}); // A client that left can't be answered, and that's fine

	await server.connect(new StdioServerTransport());
	await closed;
}
