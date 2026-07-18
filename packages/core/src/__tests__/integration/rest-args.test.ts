/**
 * Integration tests for rest-args forwarding — ctx.rest (task 2.7)
 *
 * The raw argv is split at the FIRST `--` before any option processing:
 * `head` flows through the pipeline (global extraction → parseArgs →
 * strict check), everything after `--` lands verbatim on ctx.rest.
 *
 * References: specs.md Requirement 1.3 (all scenarios) + 1.2 exemption
 * scenario; design.md D5.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../../cli.js';
import { defineCommand } from '../../command.js';
import { definePlugin } from '../../plugin.js';
import type { RunContext } from '../../types.js';

// ─── Helpers ────────────────────────────────────────────────

function mockProcessExit() {
	const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	return { exitSpy, errorSpy };
}

describe('rest args integration (ctx.rest)', () => {
	let spies: ReturnType<typeof mockProcessExit>;

	beforeEach(() => {
		spies = mockProcessExit();
	});

	afterEach(() => {
		spies.exitSpy.mockRestore();
		spies.errorSpy.mockRestore();
	});

	/** Build a CLI with an `exec` command that captures its full ctx. */
	function makeExecCLI(execOverrides: { options?: Record<string, z.ZodType> } = {}) {
		const capture: { ctx?: RunContext } = {};
		const exec = defineCommand({
			meta: { name: 'exec', description: 'Run a command' },
			...(execOverrides.options ? { options: execOverrides.options } : {}),
			run: (ctx) => {
				capture.ctx = ctx as RunContext;
			},
		});
		const status = defineCommand({
			meta: { name: 'status', description: 'Show status' },
			run: () => {},
		});
		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { exec, status },
		});
		return { cli, capture };
	}

	it('exec -- npm run build --silent → rest forwarded verbatim', async () => {
		const { cli, capture } = makeExecCLI();
		await cli.run(['exec', '--', 'npm', 'run', 'build', '--silent']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.rest).toEqual(['npm', 'run', 'build', '--silent']);
	});

	it('no -- separator → ctx.rest === []', async () => {
		const { cli, capture } = makeExecCLI();
		await cli.run(['exec']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.rest).toEqual([]);
	});

	it('flag-looking rest tokens are not parsed (no options defined)', async () => {
		const { cli, capture } = makeExecCLI();
		await cli.run(['exec', '--', '--anything', '-x', '--force=1']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.rest).toEqual(['--anything', '-x', '--force=1']);
	});

	it('THE TRAP: exec -- --help with a help plugin → help NOT rendered, exec runs with rest', async () => {
		// Help-style plugin simulated in-core via definePlugin (core tests
		// cannot depend on @runa-cmd/help); the real-plugin twin lives in
		// packages/help/src/__tests__/integration.test.ts.
		let helpRendered = false;
		const capture: { ctx?: RunContext } = {};

		const helpStylePlugin = definePlugin({
			meta: { name: '@runa-cmd/help', version: '1.0.0' },
			capabilities: { addGlobalOptions: true },
			setup: (api) => {
				api.addGlobalOption('help', z.boolean().optional().default(false), {
					alias: ['-h'],
				});
				api.hook('onGlobalFlags', (ctx) => {
					if (ctx.globalOptions?.['help']) {
						helpRendered = true;
						ctx.shortCircuit?.();
					}
				});
			},
		});

		const exec = defineCommand({
			meta: { name: 'exec', description: 'Run a command' },
			run: (ctx) => {
				capture.ctx = ctx as RunContext;
			},
		});
		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { exec },
			plugins: [helpStylePlugin],
		});

		await cli.run(['exec', '--', '--help']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(helpRendered).toBe(false);
		expect(capture.ctx?.rest).toEqual(['--help']);
	});

	it('exec --verbose -- npm test → options before -- still parse', async () => {
		const { cli, capture } = makeExecCLI({
			options: { verbose: z.boolean().default(false) },
		});
		await cli.run(['exec', '--verbose', '--', 'npm', 'test']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.options['verbose']).toBe(true);
		expect(capture.ctx?.rest).toEqual(['npm', 'test']);
	});

	it('exec -- a -- b → only the FIRST -- splits; second is a plain rest token', async () => {
		const { cli, capture } = makeExecCLI();
		await cli.run(['exec', '--', 'a', '--', 'b']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.rest).toEqual(['a', '--', 'b']);
	});

	it('variadic coexistence: lint a.ts b.ts -- --fix → validated files + unvalidated rest', async () => {
		const capture: { ctx?: RunContext } = {};
		const lint = defineCommand({
			meta: { name: 'lint', description: 'Lint files' },
			args: { files: z.array(z.string()) },
			run: (ctx) => {
				capture.ctx = ctx as RunContext;
			},
		});
		const status = defineCommand({
			meta: { name: 'status', description: 'Show status' },
			run: () => {},
		});
		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { lint, status },
		});

		await cli.run(['lint', 'a.ts', 'b.ts', '--', '--fix']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.args['files']).toEqual(['a.ts', 'b.ts']);
		expect(capture.ctx?.rest).toEqual(['--fix']);
	});

	it('strict exemption: exec -- --not-a-defined-flag under default strictOptions → no error', async () => {
		const { cli, capture } = makeExecCLI();
		await cli.run(['exec', '--', '--not-a-defined-flag']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.ctx?.rest).toEqual(['--not-a-defined-flag']);
	});

	it('rawArgs keeps the full original argv including --', async () => {
		const { cli, capture } = makeExecCLI();
		await cli.run(['exec', '--', 'npm', 'test']);

		expect(capture.ctx?.rawArgs).toEqual(['exec', '--', 'npm', 'test']);
	});
});
