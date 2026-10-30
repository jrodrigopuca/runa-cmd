/**
 * Runs the acceptance fixtures as real child processes.
 *
 * Fixtures import the built package, so a stale dist would test old code.
 * assertFreshBuild() must run first: `pending` cases also "pass" when a
 * fixture cannot start, and that must stop the suite instead of hiding.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', '..');
const builtEntry = join(srcDir, '..', 'dist', 'index.js');

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
