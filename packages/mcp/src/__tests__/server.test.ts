/**
 * Tests for MCP server creation and tool execution
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CLISchema, CommandTree } from '@runa-cmd/core';
import { defineCommand } from '@runa-cmd/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildToolRegistrations } from '../schema.js';
import { createMcpServer, registerTools } from '../server.js';

// ─── Helpers ────────────────────────────────────────────────

function makeCLISchema(commands: CLISchema['commands'] = []): CLISchema {
	return {
		meta: { name: 'test-cli', version: '1.0.0', description: 'Test CLI' },
		commands,
		globalOptions: [],
	};
}

// ─── Tests ──────────────────────────────────────────────────

describe('createMcpServer', () => {
	it('creates a server with name and version', () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		expect(server).toBeInstanceOf(McpServer);
	});

	it('creates a server with instructions', () => {
		const server = createMcpServer({
			name: 'test',
			version: '1.0.0',
			instructions: 'Use deploy to deploy things',
		});
		expect(server).toBeInstanceOf(McpServer);
	});
});

describe('registerTools', () => {
	it('registers tools on the server', () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy' },
			options: { env: z.string() },
			run() {},
		});

		const commands: CommandTree = { deploy };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);

		registerTools(server, regs);

		expect(registerSpy).toHaveBeenCalledTimes(1);
		expect(registerSpy).toHaveBeenCalledWith(
			'deploy',
			expect.objectContaining({ description: 'Deploy' }),
			expect.any(Function),
		);
	});

	it('registers zero-input tools without inputSchema', () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const ping = defineCommand({
			meta: { name: 'ping', description: 'Ping' },
			run() {},
		});

		const commands: CommandTree = { ping };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);

		registerTools(server, regs);

		expect(registerSpy).toHaveBeenCalledTimes(1);
		// Should NOT have inputSchema in config
		const config = registerSpy.mock.calls[0]?.[1] as Record<string, unknown>;
		expect(config).not.toHaveProperty('inputSchema');
	});

	it('registers tools with outputSchema when defined', () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const status = defineCommand({
			meta: { name: 'status', description: 'Status' },
			output: z.object({ ok: z.boolean() }),
			run() {
				return { ok: true };
			},
		});

		const commands: CommandTree = { status };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);

		registerTools(server, regs);

		const config = registerSpy.mock.calls[0]?.[1] as Record<string, unknown>;
		expect(config).toHaveProperty('outputSchema');
	});

	it('registers multiple tools', () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const a = defineCommand({
			meta: { name: 'a', description: 'A' },
			run() {},
		});
		const b = defineCommand({
			meta: { name: 'b', description: 'B' },
			options: { x: z.string() },
			run() {},
		});

		const commands: CommandTree = { a, b };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);

		registerTools(server, regs);

		expect(registerSpy).toHaveBeenCalledTimes(2);
	});
});

describe('tool execution (via handler)', () => {
	// We test the tool handler by extracting it from the registerTool spy

	it('executes a void command and returns success message', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const runFn = vi.fn();
		const ping = defineCommand({
			meta: { name: 'ping', description: 'Ping' },
			run: runFn,
		});

		const commands: CommandTree = { ping };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		// Extract the handler (third argument to registerTool)
		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		// For zero-input tools, the handler takes no args (or extra as first arg)
		const result = (await handler()) as { content: { text: string }[] };

		expect(runFn).toHaveBeenCalledOnce();
		expect(result.content[0]?.text).toContain('executed successfully');
	});

	it('splits args and options correctly in handler', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const runFn = vi.fn();
		const greet = defineCommand({
			meta: { name: 'greet', description: 'Greet' },
			args: { name: z.string() },
			options: { loud: z.boolean().optional().default(false) },
			run: runFn,
		});

		const commands: CommandTree = { greet };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		await handler({ name: 'Alice', loud: true });

		expect(runFn).toHaveBeenCalledWith(
			expect.objectContaining({
				args: { name: 'Alice' },
				options: { loud: true },
				globalOptions: {},
				rawArgs: [],
			}),
		);
	});

	it('returns structured content for commands with output schema', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const status = defineCommand({
			meta: { name: 'status', description: 'Status' },
			output: z.object({ ok: z.boolean(), msg: z.string() }),
			run() {
				return { ok: true, msg: 'All good' };
			},
		});

		const commands: CommandTree = { status };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		const result = (await handler()) as {
			content: { text: string }[];
			structuredContent: unknown;
		};

		expect(result.structuredContent).toEqual({ ok: true, msg: 'All good' });
		expect(result.content[0]?.text).toContain('"ok": true');
	});

	it('returns text content for non-void commands without output schema', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		// Intentionally return a value from a command without output schema
		// to test how executeToolHandler handles unexpected return values at runtime
		const echo = defineCommand({
			meta: { name: 'echo', description: 'Echo' },
			args: { text: z.string() },
			// @ts-expect-error -- testing runtime behavior when run() returns a value without output schema
			run({ args }) {
				return args.text;
			},
		});

		const commands: CommandTree = { echo };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		const result = (await handler({ text: 'hello' })) as { content: { text: string }[] };

		expect(result.content[0]?.text).toBe('hello');
	});

	it('returns isError: true when handler throws', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const fail = defineCommand({
			meta: { name: 'fail', description: 'Fail' },
			run() {
				throw new Error('Something went wrong');
			},
		});

		const commands: CommandTree = { fail };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		const result = (await handler()) as {
			isError: boolean;
			content: { text: string }[];
		};

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe('Something went wrong');
	});

	it('handles async run functions', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		const slow = defineCommand({
			meta: { name: 'slow', description: 'Slow' },
			output: z.object({ done: z.boolean() }),
			async run() {
				return { done: true };
			},
		});

		const commands: CommandTree = { slow };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		const result = (await handler()) as { structuredContent: unknown };

		expect(result.structuredContent).toEqual({ done: true });
	});

	it('returns JSON stringified for non-string results without output schema', async () => {
		const server = createMcpServer({ name: 'test', version: '1.0.0' });
		const registerSpy = vi.spyOn(server, 'registerTool');

		// Intentionally return an object from a command without output schema
		// to test how executeToolHandler JSON-stringifies non-string return values
		const info = defineCommand({
			meta: { name: 'info', description: 'Info' },
			// @ts-expect-error -- testing runtime behavior when run() returns a value without output schema
			run() {
				return { version: '1.0.0' };
			},
		});

		const commands: CommandTree = { info };
		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);
		registerTools(server, regs);

		const handler = registerSpy.mock.calls[0]?.[2] as (...args: unknown[]) => Promise<unknown>;
		const result = (await handler()) as { content: { text: string }[] };

		expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({ version: '1.0.0' });
	});
});
