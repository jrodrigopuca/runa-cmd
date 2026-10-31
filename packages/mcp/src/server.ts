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
	};
}

// ─── Results ────────────────────────────────────────────────

const success = (text: string): CallToolResult => ({ content: [{ type: 'text', text }] });

/** What happened to the command's side effects, the thing a retry depends on. */
type Effect = 'none' | 'completed' | 'unknown';

interface ToolFailure {
	class:
		| 'unknown_tool'
		| 'invalid_input'
		| 'rejected'
		| 'not_run'
		| 'command_failed'
		| 'crashed'
		| 'invalid_output'
		| 'output_too_large'
		| 'after_run_failed'
		| 'cancelled';
	effect: Effect;
}

const EFFECT_TEXT: Record<Effect, string> = {
	none: 'The command did not run, so it is safe to retry.',
	completed: 'The command already ran. Do not retry it.',
	unknown: 'The command started, so it may have taken effect. Check before retrying.',
};

/**
 * The reports say how far the command got, which is what decides whether a
 * retry can repeat its effects. Without one, a command may have done anything:
 * the safe reading of the unknown is never that nothing happened.
 */
function findFailure({ reports, status, cancelled }: ChildOutcome): ToolFailure | undefined {
	const reached = (kind: ToolReport['kind']) => reports.some((report) => report.kind === kind);
	const failed = reports.find((report) => report.kind === 'failed');

	if (cancelled) return { class: 'cancelled', effect: 'unknown' };
	if (reached('oversized')) return { class: 'output_too_large', effect: 'completed' };
	if (reached('result')) {
		if (!failed && status === 0) return undefined;
		return { class: 'after_run_failed', effect: 'completed' };
	}
	if (reached('ran')) {
		const invalid = failed?.reason === 'output';
		return { class: invalid ? 'invalid_output' : 'after_run_failed', effect: 'completed' };
	}
	if (reached('running')) {
		return { class: failed ? 'command_failed' : 'crashed', effect: 'unknown' };
	}
	if (failed) {
		return { class: failed.reason === 'input' ? 'invalid_input' : 'rejected', effect: 'none' };
	}
	return { class: status === 0 ? 'not_run' : 'crashed', effect: 'none' };
}

/** Anything the model has to read goes in the text: `_meta` is for the client. */
const failure = (reason: string, found: ToolFailure): CallToolResult => ({
	isError: true,
	content: [{ type: 'text', text: `${reason}\n\n${EFFECT_TEXT[found.effect]}` }],
	_meta: { 'runa/error': { ...found, safeToRetry: found.effect === 'none' } },
});

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
	return failure(written || printed || silentFailure(reg, outcome, found), found);
}

function silentFailure(reg: ToolRegistration, outcome: ChildOutcome, found: ToolFailure): string {
	if (found.class === 'cancelled') return `Command '${reg.name}' was cancelled.`;
	if (outcome.status !== 0) return `Command '${reg.name}' exited with code ${outcome.status}.`;
	return `Command '${reg.name}' did not ${found.effect === 'none' ? 'run' : 'finish'}.`;
}

/**
 * Exit code 0 is not enough: a middleware can skip the command and a command
 * can exit on its own. Only the reports say how far it got.
 */
export function toToolResult(reg: ToolRegistration, outcome: ChildOutcome): CallToolResult {
	const found = findFailure(outcome);
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
		{ code: 'MCP_SELF_CHECK_FAILED' },
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
			return failure(`Unknown tool: ${params.name}`, { class: 'unknown_tool', effect: 'none' });
		}

		// A fixed option stays what the operator set, whatever the call says
		const input = Object.fromEntries(
			Object.entries(params.arguments ?? {}).filter(([key]) => !reg.fixed.has(key)),
		);

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
