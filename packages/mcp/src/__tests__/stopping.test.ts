/**
 * Stopping tools and limiting their output (ADR-0033), with a real server and
 * real processes. Nothing here depends on signals reaching a child: on every
 * platform a child learns it must stop through its channel with the server.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestClient, text } from './helpers/client.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'server-cli.js');

let clients: TestClient[] = [];
let dir: string;
let traceFile: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'runa-stopping-'));
	traceFile = join(dir, 'trace');
});

afterEach(() => {
	for (const client of clients) client.close();
	clients = [];
	rmSync(dir, { recursive: true, force: true });
});

async function serve(env: Record<string, string> = {}) {
	const client = new TestClient(fixture, ['--mcp'], { TRACE_FILE: traceFile, ...env });
	clients.push(client);
	await client.initialize();
	return client;
}

const trace = () => (existsSync(traceFile) ? readFileSync(traceFile, 'utf8') : '');

function isAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function waitUntil(condition: () => boolean, ms = 8000): Promise<boolean> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (condition()) return true;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	return condition();
}

const grandchildPid = () => Number(/grandchild:(\d+)/.exec(trace())?.[1]);
const reached = (line: string) => waitUntil(() => trace().includes(line));

describe('cancelling a call', () => {
	it('tells the command, runs cleanup and ends what the command started', async () => {
		const client = await serve();
		const call = client.start('waits');
		await reached('waiting');
		const grandchild = grandchildPid();
		expect(isAlive(grandchild)).toBe(true);

		call.cancel();

		expect(await reached('cleanup')).toBe(true);
		expect(await waitUntil(() => !isAlive(grandchild))).toBe(true);
	});

	it('ends a command that ignores it, past the deadline', async () => {
		const client = await serve();
		const call = client.start('stubborn');
		await reached('waiting');
		const grandchild = grandchildPid();
		const before = Date.now();

		call.cancel();

		expect(await waitUntil(() => !isAlive(grandchild))).toBe(true);
		expect(Date.now() - before).toBeLessThan(7000);
		expect(trace()).toContain('cleanup');
	}, 10_000);
});

describe('stopping the server', () => {
	it('cancels the calls in flight and answers them before closing', async () => {
		const client = await serve();
		const call = client.start('waits');
		await reached('waiting');

		client.signal('SIGTERM');
		const result = await call.result;

		expect(result.isError).toBe(true);
		expect(result._meta?.['runa/error']).toEqual({
			class: 'cancelled',
			effect: 'unknown',
			safeToRetry: false,
		});
		expect(trace()).toContain('cleanup');
	});

	it('leaves nothing running if the server is killed', async () => {
		const client = await serve();
		client.start('waits');
		await reached('waiting');
		const grandchild = grandchildPid();

		client.signal('SIGKILL');

		expect(await reached('cleanup')).toBe(true);
		expect(await waitUntil(() => !isAlive(grandchild))).toBe(true);
	});

	it('lets a child that keeps printing finish after its pipes close', async () => {
		const client = await serve();
		client.start('talkative');
		await reached('waiting');

		client.signal('SIGKILL');

		expect(await reached('survived the closed pipes')).toBe(true);
		expect(await reached('cleanup')).toBe(true);
	});
});

describe('a process that outlives the call', () => {
	it('does not hold the call, and is left running if nobody cancelled', async () => {
		const client = await serve();
		const before = Date.now();
		const result = await client.call('daemon');

		expect(text(result)).toBe('started');
		expect(Date.now() - before).toBeLessThan(2000);
		expect(isAlive(grandchildPid())).toBe(true);
		process.kill(grandchildPid());
	});
});

describe('output limits', () => {
	const omitted = 'bytes omitted';

	it('refuses to start with a limit that makes no sense', async () => {
		const client = new TestClient(fixture, ['--mcp'], { MAX_OUTPUT: '0' });
		clients.push(client);

		expect(await client.exit()).not.toBe(0);
		expect(client.stderr).toContain('maxOutput');
	});

	it('keeps short output whole', async () => {
		const client = await serve();
		const message = text(await client.call('loud', { megabytes: 0 }));
		expect(message).toBe('STARTEND');
	});

	it('keeps the start and the end of long output, and says so', async () => {
		const client = await serve();
		const message = text(await client.call('loud', { megabytes: 1 }));

		expect(message.startsWith('START')).toBe(true);
		expect(message.endsWith('END')).toBe(true);
		expect(message).toContain(omitted);
		expect(message.length).toBeLessThan(110 * 1024);
	});

	it('takes the limit from the operator', async () => {
		const client = await serve({ MAX_OUTPUT: '1000' });
		const message = text(await client.call('big', { size: 10 }));
		expect(message).toHaveLength(10);

		const long = text(await client.call('loud', { megabytes: 1 }));
		expect(long.length).toBeLessThan(1200);
	});

	it('lets a tool have its own limit', async () => {
		const client = await serve({ TOOLS: JSON.stringify({ loud: { maxOutput: 200 } }) });
		const message = text(await client.call('loud', { megabytes: 1 }));
		expect(message.length).toBeLessThan(400);
	});

	it('survives 600 MB on stdout', async () => {
		const client = await serve();
		const message = text(await client.call('loud', { megabytes: 600 }));

		expect(message).toContain(omitted);
		expect(text(await client.call('quiet'))).toContain('executed successfully');
	}, 60_000);

	it('never cuts a fixed value in half', async () => {
		const secret = 'operator-secret-value';
		const client = await serve({ MAX_OUTPUT: '1000', TEST_TOKEN: secret });

		const pieces = [secret.slice(0, 6), secret.slice(6, 12), secret.slice(-6)];
		const assertHidden = (message: string) => {
			for (const piece of pieces) expect(message).not.toContain(piece);
		};

		// Walks the value across both points where the output is cut
		for (let offset = 480; offset <= 540; offset += 4) {
			assertHidden(text(await client.call('echoes', { before: offset, after: 3000 })));
			assertHidden(text(await client.call('echoes', { before: 3000, after: offset })));
		}
	}, 30_000);

	it('does not cut a returned value: it says it already ran', async () => {
		const client = await serve({ MAX_OUTPUT: '1000' });
		const result = await client.call('big', { size: 2000 });

		expect(result._meta?.['runa/error']).toEqual({
			class: 'output_too_large',
			effect: 'completed',
			safeToRetry: false,
		});
		expect(text(result)).toContain('already ran');
	});
});
