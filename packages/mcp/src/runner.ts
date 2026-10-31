/**
 * @runa-cmd/mcp — Runs the CLI itself as a child process (ADR-0030)
 *
 * The request and the reports travel over their own channels, so whatever the
 * command does with stdout, stderr or process.exit stays inside the child.
 */
import { spawn } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import {
	TOOL_CALL_ENV,
	TOOL_INPUT_FD,
	TOOL_REPORT_FD,
	type ToolReport,
	type ToolRequest,
} from '@runa-cmd/core/internal';

export interface RunOptions {
	/** How to start this CLI: executable and arguments */
	selfCommand: string[];
	/** Startup arguments every child receives, like global options */
	argv: string[];
	signal?: AbortSignal;
}

export interface ChildOutcome {
	status: number | null;
	stdout: string;
	stderr: string;
	reports: ToolReport[];
}

/** How this process was started, which is how to start it again. */
export function defaultSelfCommand(): string[] {
	return [process.execPath, ...process.execArgv, process.argv[1] ?? ''];
}

function parseReports(raw: string): ToolReport[] {
	return raw
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as ToolReport);
}

function collect(stream: Readable): () => string {
	const chunks: Buffer[] = [];
	stream.on('data', (chunk: Buffer) => chunks.push(chunk));
	return () => Buffer.concat(chunks).toString('utf8');
}

export function runChild(request: ToolRequest, options: RunOptions): Promise<ChildOutcome> {
	const [executable = '', ...selfArgs] = options.selfCommand;

	return new Promise((resolve) => {
		const child = spawn(executable, [...selfArgs, ...options.argv], {
			stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'],
			env: { ...process.env, [TOOL_CALL_ENV]: '1' },
			signal: options.signal,
			windowsHide: true,
		});

		const stdout = collect(child.stdout as Readable);
		const stderr = collect(child.stderr as Readable);
		const reports = collect(child.stdio[TOOL_REPORT_FD] as Readable);

		const input = child.stdio[TOOL_INPUT_FD] as Writable;
		input.on('error', () => {}); // A child that dies early closes this pipe: its exit tells why
		input.end(JSON.stringify(request));

		let spawnError = '';
		child.on('error', (error) => {
			spawnError = error.message;
		});
		child.on('close', (status) => {
			resolve({
				status,
				stdout: stdout(),
				stderr: stderr() || spawnError,
				reports: parseReports(reports()),
			});
		});
	});
}
