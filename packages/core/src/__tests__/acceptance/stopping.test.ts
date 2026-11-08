/**
 * Stopping a run from outside (ADR-0033), with real processes and real signals.
 * On Unix the process ends by the signal itself, so the shell sees 130 or 143
 * and systemd sees a clean stop (ADR-0046). Windows has no signals to send from
 * outside: the same path is covered there through a cancelled tool, in
 * @runa-cmd/mcp.
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
	it.each(['SIGINT', 'SIGTERM'] as const)(
		'%s aborts ctx.signal, runs cleanup and ends by the same signal',
		async (signal) => {
			const run = await started('cooperative');
			run.child.kill(signal);
			const result = await run.exited;

			// Died of the signal, not exit(130/143): that's what systemd reads as clean
			expect(result.signal).toBe(signal);
			expect(result.status).toBeNull();
			expect(result.stdout).toContain('cleanup:true');
			expect(result.stderr).toContain('Interrupted.');
		},
	);

	it('goes through onError when run() fails because of it', async () => {
		const run = await started('cooperative');
		run.child.kill('SIGINT');
		expect((await run.exited).stdout).toContain('onError:INTERRUPTED');
	});

	it.each(['SIGINT', 'SIGTERM'] as const)(
		'is not an error if run() ends well after %s (F-07)',
		async (signal) => {
			const run = await started('finishes-anyway');
			run.child.kill(signal);
			const result = await run.exited;

			expect(result.signal).toBe(signal);
			expect(result.stderr).not.toContain('Interrupted.');
			expect(result.stdout).not.toContain('onError');
			expect(result.stdout).toContain('afterRun');
			expect(result.stdout).toContain('cleanup:true');
		},
	);

	it('waits for a command that ignores it only as long as the grace period', async () => {
		const run = await started('ignores');
		const before = Date.now();
		run.child.kill('SIGINT');
		const result = await run.exited;
		const elapsed = Date.now() - before;

		expect(result.signal).toBe('SIGINT');
		expect(result.stderr).toContain('Interrupted.');
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

		expect(result.signal).toBe('SIGINT');
		expect(Date.now() - before).toBeLessThan(1500);
	});

	it('forces the exit if cleanup hangs', async () => {
		const run = await started('cooperative', { CLEANUP_HANGS: '1' });
		const before = Date.now();
		run.child.kill('SIGTERM');
		const result = await run.exited;
		const elapsed = Date.now() - before;

		expect(result.signal).toBe('SIGTERM');
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
