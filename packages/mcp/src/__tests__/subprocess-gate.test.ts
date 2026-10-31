/**
 * Gate for ADR-0030 (T-300): what running tools as subprocesses depends on,
 * with real processes on every OS of the CI matrix. It tests the platform, not
 * Runa, so a failure here must stop the design before anyone builds on it.
 */
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'gate-child.js');
const isWindows = process.platform === 'win32';
const MB = 1024 * 1024;

const children: ChildProcess[] = [];

function start(mode: string, env: Record<string, string> = {}) {
	const child = spawn(process.execPath, [fixture, mode], {
		stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe', 'ipc'],
		env: { ...process.env, ...env },
		detached: !isWindows,
		windowsHide: true,
	});
	children.push(child);
	return child;
}

/** Ends a process and whatever it started. */
function killTree(pid: number): void {
	if (isWindows) {
		execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
	} else {
		process.kill(-pid, 'SIGKILL');
	}
}

function isAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function waitUntil(condition: () => boolean, ms = 4000): Promise<boolean> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (condition()) return true;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	return condition();
}

const firstMessage = <T>(child: ChildProcess) =>
	new Promise<T>((resolve) => child.once('message', (message) => resolve(message as T)));

afterEach(() => {
	for (const child of children.splice(0)) {
		if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
	}
});

describe('subprocess gate', () => {
	it('passes large JSON in and gets a large result back, over internal channels', async () => {
		const text = 'x'.repeat(5 * MB);
		const child = start('echo');

		const input = child.stdio[3] as NodeJS.WritableStream;
		const output = child.stdio[4] as NodeJS.ReadableStream;
		const chunks: Buffer[] = [];
		output.on('data', (chunk: Buffer) => chunks.push(chunk));

		const closed = new Promise<number | null>((resolve) => child.on('close', resolve));
		input.end(JSON.stringify({ text }));
		const status = await closed;

		const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
		expect(status).toBe(0);
		expect(result.size).toBe(text.length);
		expect(result.reply).toBe(text);
	}, 20000);

	it('lets a cancelled child run its cleanup, by dropping the channel', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'runa-gate-'));
		const marker = join(dir, 'cleanup');
		const child = start('cancellable', { MARKER: marker });

		await firstMessage(child);
		child.disconnect();

		expect(await waitUntil(() => existsSync(marker))).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	it('tells a child that its parent died abruptly', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'runa-gate-'));
		const marker = join(dir, 'cleanup');
		const parent = start('parent', { MARKER: marker });

		await firstMessage(parent);
		parent.kill('SIGKILL');

		expect(await waitUntil(() => existsSync(marker))).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	it('ends a process together with the ones it started', async () => {
		const child = start('tree');
		const grandchild = await firstMessage<number>(child);
		expect(isAlive(grandchild)).toBe(true);

		killTree(child.pid as number);

		expect(await waitUntil(() => !isAlive(grandchild))).toBe(true);
	});
});
