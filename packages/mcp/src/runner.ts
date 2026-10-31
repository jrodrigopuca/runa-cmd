/**
 * @runa-cmd/mcp — Runs the CLI itself as a child process (ADR-0030)
 *
 * The request and the reports travel over their own channels, so whatever the
 * command does with stdout, stderr or process.exit stays inside the child.
 * Each child leads its own process group and holds an IPC channel with this
 * process: cutting it tells the child to stop, and so does this process dying,
 * however it dies (ADR-0033).
 */
import { spawn } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import {
	killProcessTree,
	STOP_DEADLINE_MS,
	TOOL_CALL_ENV,
	TOOL_INPUT_FD,
	TOOL_REPORT_FD,
	type ToolReport,
	type ToolRequest,
} from '@runa-cmd/core/internal';
import { redact } from './operator.js';

const IPC_CHANNEL = 'ipc';

/** Enough for what the child wrote to reach us; a process it left holding stdio can't delay more. */
const DRAIN_MS = 250;

/** About 25,000 tokens, more than what a model can use from one call. */
export const DEFAULT_MAX_OUTPUT = 100 * 1024;

export interface RunOptions {
	/** How to start this CLI: executable and arguments */
	selfCommand: string[];
	/** Startup arguments every child receives, like global options */
	argv: string[];
	signal?: AbortSignal;
	/** Most bytes kept from stdout, and from stderr */
	maxOutput?: number;
	/** Values to hide from what the command prints */
	redactions?: string[];
}

export interface ChildOutcome {
	status: number | null;
	stdout: string;
	stderr: string;
	reports: ToolReport[];
	/** It ended because it was told to stop */
	cancelled?: boolean;
}

const running = new Map<number, Promise<ChildOutcome>>();

/** Resolves once every child ended, for a server that is closing. */
export async function childrenFinished(): Promise<void> {
	await Promise.all(running.values());
}

let endsChildrenOnExit = false;

/** The last net for an exit that didn't go through closing the server. */
function endChildrenOnExit(): void {
	if (endsChildrenOnExit) return;
	endsChildrenOnExit = true;
	process.on('exit', () => {
		for (const pid of running.keys()) killProcessTree(pid);
	});
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

/**
 * Keep the start and the end of a stream, whatever its size. Both ends hold
 * extra bytes, dropped after redacting: a value cut in half can't be found, so
 * the cut must never fall on something still visible.
 */
function collectEnds(stream: Readable, limit: number, redactions: string[]): () => string {
	const margin = Math.max(0, ...redactions.map((value) => Buffer.byteLength(value)));
	const keep = Math.ceil(limit / 2) + margin;
	let head: Buffer = Buffer.alloc(0);
	let tail: Buffer = Buffer.alloc(0);
	let seen = 0;

	stream.on('data', (chunk: Buffer) => {
		seen += chunk.length;
		const room = keep - head.length;
		if (room > 0) head = Buffer.concat([head, chunk.subarray(0, room)]);
		const rest = chunk.subarray(Math.max(room, 0));
		if (rest.length > 0) tail = Buffer.concat([tail, rest]).subarray(-keep);
	});

	return () => {
		if (head.length + tail.length === seen) {
			return redact(Buffer.concat([head, tail]).toString('utf8'), redactions);
		}
		const start = redact(head.toString('utf8'), redactions);
		const end = redact(tail.toString('utf8'), redactions);
		const notice = `[Output truncated: ${seen - limit} bytes omitted]`;
		return `${start.slice(0, start.length - margin)}\n\n${notice}\n\n${end.slice(margin)}`;
	};
}

export function runChild(request: ToolRequest, options: RunOptions): Promise<ChildOutcome> {
	const [executable = '', ...selfArgs] = options.selfCommand;
	const { maxOutput = DEFAULT_MAX_OUTPUT, redactions = [], signal } = options;

	endChildrenOnExit();

	const child = spawn(executable, [...selfArgs, ...options.argv], {
		stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe', IPC_CHANNEL],
		env: { ...process.env, [TOOL_CALL_ENV]: '1' },
		detached: process.platform !== 'win32',
		windowsHide: true,
	});

	const finished = new Promise<ChildOutcome>((resolve) => {
		const stdout = collectEnds(child.stdout as Readable, maxOutput, redactions);
		const stderr = collectEnds(child.stderr as Readable, maxOutput, redactions);
		const reports = collect(child.stdio[TOOL_REPORT_FD] as Readable);

		const input = child.stdio[TOOL_INPUT_FD] as Writable;
		input.on('error', () => {}); // A child that dies early closes this pipe: its exit tells why
		input.end(JSON.stringify(request));

		let force: NodeJS.Timeout | undefined;
		const cancel = () => {
			if (child.connected) child.disconnect();
			force = setTimeout(() => {
				if (child.pid !== undefined) killProcessTree(child.pid);
			}, STOP_DEADLINE_MS);
		};
		if (signal?.aborted) cancel();
		else signal?.addEventListener('abort', cancel, { once: true });

		let spawnError = '';
		let settled = false;

		const settle = (status: number | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(force);
			signal?.removeEventListener('abort', cancel);
			if (child.pid !== undefined) running.delete(child.pid);
			for (const stream of child.stdio) stream?.destroy();

			resolve({
				status,
				stdout: stdout(),
				stderr: stderr() || spawnError,
				reports: parseReports(reports()),
				cancelled: signal?.aborted,
			});
		};

		child.on('error', (error) => {
			spawnError = error.message;
		});
		child.on('close', settle);
		// A process the command left behind can hold stdio long after this one is gone
		child.on('exit', (status) => setTimeout(() => settle(status), DRAIN_MS).unref());
	});

	if (child.pid !== undefined) running.set(child.pid, finished);
	return finished;
}
