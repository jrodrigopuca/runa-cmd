/**
 * Integration tests for empty-string number coercion rejection (task 2.9)
 *
 * Number('') === 0 used to silently fabricate 0 for empty/whitespace-only
 * strings at all three resolution sources. coerceNumberValue() (task 2.8,
 * design D7) now declines to coerce, so Zod rejects the string through the
 * existing humanizer as a ValidationError (exit 2).
 *
 * Parametrized across all THREE sources: CLI arg, env var, config value.
 * References: specs.md Requirement 1.5 (all 6 scenarios); design.md D7.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../../cli.js';
import { defineCommand } from '../../command.js';

// ─── Helpers ────────────────────────────────────────────────

function mockProcessExit() {
	const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	return { exitSpy, errorSpy };
}

function stderrOutput(errorSpy: ReturnType<typeof mockProcessExit>['errorSpy']): string {
	return errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
}

const ENV_NAME = 'RUNA_TEST_EMPTY_PORT';

describe('empty-string number coercion integration', () => {
	let spies: ReturnType<typeof mockProcessExit>;
	let configDir: string;

	/** Write {name}.config.json into the per-suite temp dir. */
	async function writeConfig(values: Record<string, unknown>): Promise<void> {
		await writeFile(join(configDir, 'myapp.config.json'), JSON.stringify(values));
	}

	function makeCLI(opts: { withEnv?: boolean; withConfig?: boolean } = {}) {
		const capture: { port?: unknown; ran: boolean } = { ran: false };
		const serve = defineCommand({
			meta: {
				name: 'serve',
				description: 'Start the server',
				options: opts.withEnv ? { port: { env: ENV_NAME } } : undefined,
			},
			options: { port: z.number() },
			run: (ctx) => {
				capture.ran = true;
				capture.port = ctx.options['port'];
			},
		});
		const status = defineCommand({
			meta: { name: 'status', description: 'Show status' },
			run: () => {},
		});
		const cli = defineCLI({
			meta: { name: 'myapp' },
			commands: { serve, status },
			...(opts.withConfig ? { config: { name: 'myapp', searchPaths: [configDir] } } : {}),
		});
		return { cli, capture };
	}

	beforeAll(async () => {
		configDir = await mkdtemp(join(tmpdir(), 'runa-empty-string-'));
	});

	afterAll(async () => {
		await rm(configDir, { recursive: true, force: true });
	});

	beforeEach(() => {
		spies = mockProcessExit();
	});

	afterEach(async () => {
		spies.exitSpy.mockRestore();
		spies.errorSpy.mockRestore();
		delete process.env[ENV_NAME];
		await rm(join(configDir, 'myapp.config.json'), { force: true });
	});

	// ─── Rejection, parametrized across the three sources ─────

	interface SourceCase {
		source: string;
		emptyValue: string;
		run: (emptyValue: string) => Promise<{ capture: { port?: unknown; ran: boolean } }>;
	}

	const sourceCases: SourceCase[] = [
		{
			source: 'CLI arg',
			emptyValue: '',
			run: async (emptyValue) => {
				const { cli, capture } = makeCLI();
				await cli.run(['serve', '--port', emptyValue]);
				return { capture };
			},
		},
		{
			source: 'CLI arg (whitespace-only)',
			emptyValue: '   ',
			run: async (emptyValue) => {
				const { cli, capture } = makeCLI();
				await cli.run(['serve', '--port', emptyValue]);
				return { capture };
			},
		},
		{
			source: 'env var',
			emptyValue: '',
			run: async (emptyValue) => {
				process.env[ENV_NAME] = emptyValue;
				const { cli, capture } = makeCLI({ withEnv: true });
				await cli.run(['serve']);
				return { capture };
			},
		},
		{
			source: 'config value',
			emptyValue: '',
			run: async (emptyValue) => {
				const { cli, capture } = makeCLI({ withConfig: true });
				await writeConfig({ port: emptyValue });
				await cli.run(['serve']);
				return { capture };
			},
		},
	];

	it.each(
		sourceCases,
	)('$source: empty string → ValidationError naming --port, exit 2, never 0', async ({
		emptyValue,
		run,
	}) => {
		const { capture } = await run(emptyValue);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		expect(stderrOutput(spies.errorSpy)).toContain('--port');
		expect(capture.ran).toBe(false);
		expect(capture.port).not.toBe(0);
	});

	it('empty env var MUST NOT fall through to config with a coerced 0', async () => {
		// Env provides '' while config provides a valid number — the empty env
		// value wins the priority chain and MUST be rejected, not skipped.
		process.env[ENV_NAME] = '';
		const { cli, capture } = makeCLI({ withEnv: true, withConfig: true });
		await writeConfig({ port: 3000 });
		await cli.run(['serve']);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		expect(capture.ran).toBe(false);
	});

	// ─── Legitimate zero still passes ─────────────────────────

	it('--port 0 succeeds with port === 0', async () => {
		const { cli, capture } = makeCLI();
		await cli.run(['serve', '--port', '0']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.port).toBe(0);
	});

	it('config providing the number 0 succeeds with port === 0', async () => {
		const { cli, capture } = makeCLI({ withConfig: true });
		await writeConfig({ port: 0 });
		await cli.run(['serve']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.port).toBe(0);
	});

	// ─── Non-numeric strings keep the humanized type error ────

	it('--port abc → humanized type error (expected number), exit 2', async () => {
		const { cli, capture } = makeCLI();
		await cli.run(['serve', '--port', 'abc']);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		expect(stderrOutput(spies.errorSpy)).toContain('expected number');
		expect(capture.ran).toBe(false);
	});
});
