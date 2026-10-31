/**
 * @runa-cmd/core — Stopping a run (ADR-0033)
 *
 * A signal and a cut channel with the server enter here and go the same way:
 * tell the command, give it a moment, run cleanup, and leave. Nothing in that
 * path depends on the command cooperating, except how fast it ends.
 */
import { spawnSync } from 'node:child_process';
import { InterruptedError } from './errors.js';

/** How long run() has to end once told to stop. */
export const RUN_GRACE_MS = 2000;
/** How long after that notice the process ends anyway, with cleanup or without it. */
export const STOP_DEADLINE_MS = 5000;

type StopCause = 'SIGINT' | 'SIGTERM' | 'cancelled';

/** 128 + the signal number. A cancelled tool ends as if it got SIGTERM. */
const EXIT_CODES: Record<StopCause, number> = { SIGINT: 130, SIGTERM: 143, cancelled: 143 };

const STOP_MESSAGES: Record<StopCause, string> = {
	SIGINT: 'Interrupted.',
	SIGTERM: 'Interrupted.',
	cancelled: 'Cancelled.',
};

/**
 * End a process and those it started. It reaches the group on Unix, so the
 * process must lead one, and the tree on Windows, where it must still be alive.
 */
export function killProcessTree(pid: number): void {
	try {
		if (process.platform === 'win32') {
			spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
				stdio: 'ignore',
				windowsHide: true,
			});
		} else {
			process.kill(-pid, 'SIGKILL');
		}
	} catch {
		// Already gone
	}
}

export interface RunStop {
	readonly signal: AbortSignal;
	/** The exit code a stop asks for, once there was one */
	readonly exitCode: number | undefined;
	/** Run the command, giving up on it once its grace period is over */
	guard(run: () => Promise<void>): Promise<void>;
	/** The run ended: stop listening, and end what a stopped tool left behind */
	finish(): void;
}

/**
 * Start listening for a stop.
 *
 * @param isTool - This process leads its own group, and has a server above it
 */
export function watchForStop(isTool: boolean): RunStop {
	const controller = new AbortController();
	let cause: StopCause | undefined;

	let graceOver: (reason: Error) => void = () => {};
	const gracePeriod = new Promise<never>((_, reject) => {
		graceOver = reject;
	});
	gracePeriod.catch(() => {}); // Nobody is listening unless a command is running

	const interrupted = () => new InterruptedError(STOP_MESSAGES[cause ?? 'SIGINT']);

	const leave = () => {
		if (isTool) killProcessTree(process.pid);
		process.exit(EXIT_CODES[cause ?? 'SIGINT']);
	};

	const stop = (next: StopCause) => {
		if (cause) {
			leave();
			return;
		}
		cause = next;
		controller.abort(interrupted());
		setTimeout(() => graceOver(interrupted()), RUN_GRACE_MS).unref();
		setTimeout(leave, STOP_DEADLINE_MS).unref();
	};

	const onSigint = () => stop('SIGINT');
	const onSigterm = () => stop('SIGTERM');
	const onDisconnect = () => stop('cancelled');

	process.on('SIGINT', onSigint);
	process.on('SIGTERM', onSigterm);
	if (isTool) {
		process.on('disconnect', onDisconnect);
		// With the server gone, a write finds a closed pipe: that must not end
		// the process before its cleanup does.
		for (const stream of [process.stdout, process.stderr]) stream.on('error', () => {});
	}

	return {
		signal: controller.signal,
		get exitCode() {
			return cause && EXIT_CODES[cause];
		},
		async guard(run) {
			if (cause) throw interrupted();
			try {
				await Promise.race([run(), gracePeriod]);
			} catch (error) {
				if (cause) throw interrupted();
				throw error;
			}
			if (cause) throw interrupted();
		},
		finish() {
			process.off('SIGINT', onSigint);
			process.off('SIGTERM', onSigterm);
			process.off('disconnect', onDisconnect);
			if (cause && isTool) killProcessTree(process.pid);
		},
	};
}
