/**
 * @runa-cmd/mcp — MCP server over a CLI run as subprocesses
 *
 * Uses the SDK's low-level Server: schemas are only described here, because
 * validating in the server would apply transforms and defaults that the child
 * applies again. The child owns validation, as in any run of the CLI.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	type CallToolResult,
	ListToolsRequestSchema,
	type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RunaError } from '@runa-cmd/core';
import { type ZodType, z } from 'zod';
import type { ChildOutcome, RunOptions } from './runner.js';
import { runChild } from './runner.js';
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

const failure = (text: string): CallToolResult => ({
	isError: true,
	content: [{ type: 'text', text }],
});

const success = (text: string): CallToolResult => ({ content: [{ type: 'text', text }] });

/**
 * Exit code 0 is not enough: a middleware can skip the command and a command
 * can exit on its own. Only the report says the command finished.
 */
export function toToolResult(reg: ToolRegistration, outcome: ChildOutcome): CallToolResult {
	const finished = outcome.reports.find((report) => report.kind === 'result');

	if (!finished) {
		if (outcome.status === 0) return failure(`Command '${reg.name}' did not finish.`);
		const reason = outcome.stderr.trim() || outcome.stdout.trim();
		return failure(reason || `Command '${reg.name}' exited with code ${outcome.status}.`);
	}

	const { value } = finished;
	if (value === undefined || value === null) {
		return success(outcome.stdout.trim() || `Command '${reg.name}' executed successfully.`);
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
		if (!reg) return failure(`Unknown tool: ${params.name}`);

		const outcome = await runChild(
			{ kind: 'call', path: reg.path, input: params.arguments ?? {} },
			{ ...options, signal: extra.signal },
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

	const server = createMcpServer(registrations, options);
	const closed = new Promise<void>((resolve) => {
		server.onclose = resolve;
	});

	const close = () => void server.close();
	process.once('SIGINT', close);
	process.once('SIGTERM', close);
	process.stdin.once('end', close);

	await server.connect(new StdioServerTransport());
	await closed;
}
