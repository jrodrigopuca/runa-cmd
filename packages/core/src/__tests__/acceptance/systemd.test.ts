/**
 * A Runa service stopped by systemd is a clean stop, not a failure (ADR-0046).
 * systemd counts death by SIGTERM as clean, and exit code 143 as a failure:
 * the control proves that much, so a pass for Runa means something.
 *
 * Runs only with RUNA_REQUIRE_SYSTEMD, in CI on Linux, where systemd is
 * running and sudo needs no password.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assertFreshBuild } from './harness.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'stopping.js');
const units: string[] = [];

const sudo = (...args: string[]) => spawnSync('sudo', args, { encoding: 'utf8' });

/** Start a command as a transient service, and wait until it says it's ready */
async function serve(name: string, ...command: string[]) {
	const unit = `runa-${name}-${process.pid}`;
	const log = join(tmpdir(), `${unit}.log`);
	units.push(unit);
	const started = sudo(
		'systemd-run',
		`--unit=${unit}`,
		'-p',
		`StandardOutput=file:${log}`,
		...command,
	);
	expect(started.status, started.stderr).toBe(0);

	const deadline = Date.now() + 10_000;
	while (!(existsSync(log) && readFileSync(log, 'utf8').includes('ready'))) {
		if (Date.now() > deadline) throw new Error(`${unit} never got ready`);
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return { unit, log };
}

/** Stop it as systemd does, and ask whether systemd thinks it failed */
function stop(unit: string) {
	expect(sudo('systemctl', 'stop', unit).status).toBe(0);
	return sudo('systemctl', 'is-failed', unit).stdout.trim();
}

beforeAll(assertFreshBuild);

afterEach(() => {
	for (const unit of units.splice(0)) {
		sudo('systemctl', 'stop', unit);
		sudo('systemctl', 'reset-failed', unit);
		// systemd wrote it as root, and /tmp only lets its owner delete it
		sudo('rm', '-f', join(tmpdir(), `${unit}.log`));
	}
});

describe.skipIf(!process.env.RUNA_REQUIRE_SYSTEMD)('systemd stops a Runa service', () => {
	it('counts exit(143) as a failure: the control', async () => {
		const { unit } = await serve(
			'control',
			process.execPath,
			'-e',
			"process.on('SIGTERM', () => process.exit(143)); console.log('ready'); setInterval(() => {}, 1000);",
		);

		expect(stop(unit)).toBe('failed');
	});

	it('counts a Runa service that stops well as clean', async () => {
		const { unit, log } = await serve('service', process.execPath, fixture, 'finishes-anyway');

		expect(stop(unit)).not.toBe('failed');
		expect(readFileSync(log, 'utf8')).toContain('cleanup:true');
	});

	it('counts a Runa command that fails on the signal as clean too', async () => {
		const { unit } = await serve('cooperative', process.execPath, fixture, 'cooperative');

		expect(stop(unit)).not.toBe('failed');
	});
});
