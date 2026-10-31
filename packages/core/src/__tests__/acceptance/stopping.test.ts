/**
 * Stopping a run from outside (ADR-0033), with real processes and real signals.
 * Windows has no signals to send from outside: the same path is covered there
 * through a cancelled tool, in @runa-cmd/mcp.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild, runFixture, startFixture } from './harness.js';

beforeAll(assertFreshBuild);

const started = async (command: string, env: Record<string, string> = {}) => {
	const run = startFixture('stopping.js', [command], env);
	await run.written('ready');
	return run;
};

describe.skipIf(process.platform === 'win32')('a signal stops the run', () => {
	it.each([
		['SIGINT', 130],
		['SIGTERM', 143],
	] as const)('%s aborts ctx.signal, runs cleanup and exits with %i', async (signal, status) => {
		const run = await started('cooperative');
		run.child.kill(signal);
		const result = await run.exited;

		expect(result.status).toBe(status);
		expect(result.stdout).toContain('cleanup:true');
		expect(result.stderr).toContain('Interrupted.');
	});

	it('goes through onError like any other failure', async () => {
		const run = await started('cooperative');
		run.child.kill('SIGINT');
		expect((await run.exited).stdout).toContain('onError:INTERRUPTED');
	});

	it('is still an interruption if run() returns after the signal', async () => {
		const run = await started('finishes-anyway');
		run.child.kill('SIGINT');
		expect((await run.exited).status).toBe(130);
	});

	it('waits for a command that ignores it only as long as the grace period', async () => {
		const run = await started('ignores');
		const before = Date.now();
		run.child.kill('SIGINT');
		const result = await run.exited;
		const elapsed = Date.now() - before;

		expect(result.status).toBe(130);
		expect(result.stdout).toContain('cleanup:true');
		expect(elapsed).toBeGreaterThanOrEqual(1900);
		expect(elapsed).toBeLessThan(4000);
	});

	it('leaves at once on a second signal', async () => {
		const run = await started('ignores');
		const before = Date.now();
		run.child.kill('SIGINT');
		await new Promise((resolve) => setTimeout(resolve, 100));
		run.child.kill('SIGINT');
		const result = await run.exited;

		expect(result.status).toBe(130);
		expect(Date.now() - before).toBeLessThan(1500);
	});

	it('forces the exit if cleanup hangs', async () => {
		const run = await started('cooperative', { CLEANUP_HANGS: '1' });
		const before = Date.now();
		run.child.kill('SIGTERM');
		const result = await run.exited;
		const elapsed = Date.now() - before;

		expect(result.status).toBe(143);
		expect(elapsed).toBeGreaterThanOrEqual(4900);
		expect(elapsed).toBeLessThan(7000);
	}, 10_000);
});

describe('a run nobody stops', () => {
	it('has a signal that stays quiet, and exits by itself', () => {
		const result = runFixture('stopping.js', ['quick']);
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('quick:false');
		expect(result.stdout).toContain('cleanup:false');
	});
});
