/**
 * A minimal MCP client over real stdio, so tests see what an agent sees:
 * the actual server process and the actual JSON-RPC on its stdout.
 */
import { type ChildProcess, spawn } from 'node:child_process';

export interface ToolResult {
	content: Array<{ type: string; text: string }>;
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
	_meta?: { 'runa/error'?: { class: string; effect: string; safeToRetry: boolean } };
}

interface Response {
	id: number;
	result: Record<string, any>;
	error?: { message: string };
}

export class TestClient {
	readonly stdoutNoise: string[] = [];
	stderr = '';
	private readonly server: ChildProcess;
	private readonly waiting = new Map<number, (response: Response) => void>();
	private nextId = 1;

	constructor(fixture: string, argv: string[], env: Record<string, string> = {}) {
		this.server = spawn(process.execPath, [fixture, ...argv], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: { ...process.env, ...env },
		});

		let buffer = '';
		this.server.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
			buffer += chunk;
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) this.receive(line);
		});
		this.server.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
			this.stderr += chunk;
		});
	}

	private receive(line: string): void {
		try {
			const response = JSON.parse(line) as Response;
			this.waiting.get(response.id)?.(response);
		} catch {
			this.stdoutNoise.push(line);
		}
	}

	private write(message: Record<string, unknown>): void {
		this.server.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
	}

	request(method: string, params: Record<string, unknown> = {}): Promise<Response> {
		const id = this.nextId++;
		return new Promise((resolve) => {
			this.waiting.set(id, resolve);
			this.write({ id, method, params });
		});
	}

	async initialize(): Promise<void> {
		await this.request('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'test', version: '1.0.0' },
		});
		this.write({ method: 'notifications/initialized' });
	}

	async tools(): Promise<Array<Record<string, any>>> {
		return (await this.request('tools/list')).result.tools;
	}

	async call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
		const response = await this.request('tools/call', { name, arguments: args });
		return response.result as ToolResult;
	}

	/** Resolves with the exit code, for a server that must refuse to start. */
	exit(): Promise<number | null> {
		return new Promise((resolve) => this.server.once('close', resolve));
	}

	close(): void {
		this.server.kill();
	}
}

export const text = (result: ToolResult): string =>
	result.content.map((block) => block.text).join('\n');
