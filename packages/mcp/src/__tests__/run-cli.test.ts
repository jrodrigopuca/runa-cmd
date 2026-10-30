/**
 * A single-command CLI as a real MCP server: a child process speaking
 * JSON-RPC over stdio, with no mocks (ADR-0023).
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'single.js');

interface Response {
	id: number;
	result: Record<string, any>;
}

let server: ChildProcess;
let nextId = 1;
const waiting = new Map<number, (response: Response) => void>();

function request(method: string, params: Record<string, unknown>): Promise<Response> {
	const id = nextId++;
	return new Promise((resolve) => {
		waiting.set(id, resolve);
		server.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
	});
}

beforeAll(async () => {
	server = spawn(process.execPath, [fixture, '--mcp'], { stdio: ['pipe', 'pipe', 'inherit'] });

	let buffer = '';
	server.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
		buffer += chunk;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			const response = JSON.parse(line) as Response;
			waiting.get(response.id)?.(response);
		}
	});

	await request('initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'test', version: '1.0.0' },
	});
	server.stdin?.write(
		`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
	);
});

afterAll(() => {
	server.kill();
});

describe('runCLI with mcpPlugin', () => {
	it('exposes the command as a tool named after it', async () => {
		const { result } = await request('tools/list', {});
		expect(result.tools.map((tool: { name: string }) => tool.name)).toEqual(['encode']);
	});

	it('runs the tool', async () => {
		const { result } = await request('tools/call', {
			name: 'encode',
			arguments: { content: 'hola' },
		});
		expect(result.content[0].text).toBe('encoded: hola');
	});
});
