/**
 * @runa-cmd/mcp — MCP server creation and tool registration
 *
 * Creates an MCP server, registers tools from ToolRegistrations,
 * and manages the server lifecycle (stdio transport, signal handlers).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolRegistration } from './schema.js';

// ─── Server Creation ────────────────────────────────────────

/**
 * Create an MCP server with the given metadata.
 */
export function createMcpServer(opts: {
	name: string;
	version: string;
	instructions?: string;
}): McpServer {
	return new McpServer(
		{ name: opts.name, version: opts.version },
		{ instructions: opts.instructions },
	);
}

// ─── Tool Registration ──────────────────────────────────────

/**
 * Register MCP tools on the server from ToolRegistration objects.
 *
 * Each tool's handler:
 * 1. Splits the input back into args/options using stored key sets
 * 2. Calls command.run() with a constructed RunContext
 * 3. Returns structured content if outputSchema exists, text otherwise
 * 4. Catches errors and returns isError: true
 */
export function registerTools(server: McpServer, registrations: ToolRegistration[]): void {
	for (const reg of registrations) {
		const hasInput = Object.keys(reg.inputShape).length > 0;

		if (hasInput) {
			server.registerTool(
				reg.name,
				{
					description: reg.description,
					inputSchema: reg.inputShape,
					...(reg.outputSchema ? { outputSchema: reg.outputSchema } : {}),
				},
				async (input: Record<string, unknown>) => {
					return executeToolHandler(reg, input);
				},
			);
		} else {
			server.registerTool(
				reg.name,
				{
					description: reg.description,
					...(reg.outputSchema ? { outputSchema: reg.outputSchema } : {}),
				},
				async () => {
					return executeToolHandler(reg, {});
				},
			);
		}
	}
}

/**
 * Execute a tool handler — splits input into args/options, runs the command,
 * and returns the appropriate MCP result.
 */
async function executeToolHandler(
	reg: ToolRegistration,
	input: Record<string, unknown>,
): Promise<CallToolResult> {
	// Split input back into args and options
	const runArgs: Record<string, unknown> = {};
	const runOptions: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(input)) {
		if (reg.argKeys.has(key)) {
			runArgs[key] = value;
		} else {
			runOptions[key] = value;
		}
	}

	try {
		const result = await reg.command.run({
			args: runArgs,
			options: runOptions,
			globalOptions: {},
			command: reg.command.meta,
			rawArgs: [],
			rest: [],
		});

		// Command has output schema — return structured content
		if (reg.outputSchema) {
			reg.outputSchema.parse(result);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
				structuredContent: result as Record<string, unknown>,
			};
		}

		// Command returned something (but no output schema)
		if (result !== undefined && result !== null) {
			const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
			return {
				content: [{ type: 'text' as const, text }],
			};
		}

		// Void command — success message
		return {
			content: [{ type: 'text' as const, text: `Command '${reg.name}' executed successfully.` }],
		};
	} catch (err) {
		return {
			isError: true,
			content: [
				{
					type: 'text' as const,
					text: err instanceof Error ? err.message : String(err),
				},
			],
		};
	}
}

// ─── Server Lifecycle ───────────────────────────────────────

/**
 * Start the MCP server on stdio transport.
 * Registers signal handlers for graceful shutdown.
 *
 * Returns a close function for cleanup.
 */
export async function startServer(server: McpServer): Promise<{ close: () => Promise<void> }> {
	const transport = new StdioServerTransport();
	await server.connect(transport);

	const close = async () => {
		await server.close();
	};

	const handleShutdown = async () => {
		await close();
		process.exit(0);
	};

	process.on('SIGINT', handleShutdown);
	process.on('SIGTERM', handleShutdown);

	return { close };
}
