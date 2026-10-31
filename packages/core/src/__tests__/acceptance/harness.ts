/**
 * Runs the acceptance fixtures as real child processes.
 *
 * Fixtures import the built package, so a stale dist would test old code.
 * assertFreshBuild() must run first: `pending` cases also "pass" when a
 * fixture cannot start, and that must stop the suite instead of hiding.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', '..');
const builtEntry = join(srcDir, '..', 'dist', 'index.js');

/**
 * Marks behavior a backlog task has not delivered yet. It passes while the
 * behavior is missing and FAILS once it works: the task that fixes it must then
 * replace `pending` with `it`. To see the real failure of every pending case,
 * run with RUNA_SHOW_PENDING=1.
 */
export const pending = process.env.RUNA_SHOW_PENDING ? it : it.fails;

export interface Result {
	status: number | null;
	stdout: string;
	stderr: string;
}

export function runFixture(
	fixture: string,
	argv: string[],
	env: Record<string, string> = {},
): Result {
	const { RUNA_DEBUG: _ignored, ...parentEnv } = process.env;
	const { status, stdout, stderr } = spawnSync(
		process.execPath,
		[join(here, 'fixtures', fixture), ...argv],
		{ encoding: 'utf8', env: { ...parentEnv, NO_COLOR: '1', ...env } },
	);
	return { status, stdout, stderr };
}

/** A fixture still running, to act on it from outside. */
export function startFixture(fixture: string, argv: string[], env: Record<string, string> = {}) {
	const { RUNA_DEBUG: _ignored, ...parentEnv } = process.env;
	const child = spawn(process.execPath, [join(here, 'fixtures', fixture), ...argv], {
		stdio: ['ignore', 'pipe', 'pipe'],
		env: { ...parentEnv, NO_COLOR: '1', ...env },
	});

	let stdout = '';
	let stderr = '';
	child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
		stdout += chunk;
		child.stdout.emit('wrote');
	});
	child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
		stderr += chunk;
	});

	const exited = new Promise<Result>((resolve) => {
		child.on('close', (status) => resolve({ status, stdout, stderr }));
	});

	const written = (text: string) =>
		new Promise<void>((resolve) => {
			const check = () => {
				if (!stdout.includes(text)) return;
				child.stdout.off('wrote', check);
				resolve();
			};
			child.stdout.on('wrote', check);
			check();
		});

	return { child, exited, written };
}

/** Newest modification time among non-test sources. */
function newestSource(dir: string): number {
	return Math.max(
		...readdirSync(dir, { withFileTypes: true }).map((entry) => {
			const path = join(dir, entry.name);
			if (entry.name === '__tests__') return 0;
			return entry.isDirectory() ? newestSource(path) : statSync(path).mtimeMs;
		}),
	);
}

export function assertFreshBuild(): void {
	const built = statSync(builtEntry, { throwIfNoEntry: false });
	if (!built || built.mtimeMs < newestSource(srcDir)) {
		throw new Error('Acceptance tests run against dist/, which is missing or stale: pnpm build');
	}
}
