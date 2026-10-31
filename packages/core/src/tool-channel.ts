/**
 * @runa-cmd/core — Channel between an MCP server and a CLI run as a tool
 *
 * A tool call re-runs the CLI as a child process (ADR-0030). The request comes
 * in on one file descriptor and reports go out on another, so stdin, stdout and
 * stderr stay the command's own. Reports are written synchronously: they must
 * survive a process.exit right after them.
 *
 * Internal contract between @runa-cmd/core and @runa-cmd/mcp, not public API.
 */
import { readFileSync, writeSync } from 'node:fs';

export const TOOL_CALL_ENV = 'RUNA_INTERNAL_TOOL_CALL';
export const TOOL_INPUT_FD = 3;
export const TOOL_REPORT_FD = 4;

export type ToolRequest =
	/** Proves the server can re-run itself, without touching any command */
	{ kind: 'ping' } | { kind: 'call'; path: string[]; input: Record<string, unknown> };

export type ToolReport =
	| { kind: 'pong' }
	/** run() returned: its side effects happened, whatever comes next */
	| { kind: 'ran' }
	/** The whole command finished, output validated */
	| { kind: 'result'; value: unknown };

/**
 * The request of this process, if it was started as a tool. The variable is
 * removed right away, so a CLI the command starts is an ordinary CLI.
 */
export function takeToolRequest(): ToolRequest | undefined {
	if (!process.env[TOOL_CALL_ENV]) return undefined;
	delete process.env[TOOL_CALL_ENV];
	return JSON.parse(readFileSync(TOOL_INPUT_FD, 'utf8')) as ToolRequest;
}

export function sendToolReport(report: ToolReport): void {
	const line = Buffer.from(`${JSON.stringify(report)}\n`);
	let written = 0;
	while (written < line.length) {
		written += writeSync(TOOL_REPORT_FD, line, written);
	}
}
