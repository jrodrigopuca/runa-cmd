/**
 * onError/cleanup hook failure logging — beta-readiness task 3.7 (design D8, spec 2.5).
 *
 * The bare catches that protect cleanup from broken hook handlers now log the
 * handler's own defect to stderr. Cleanup semantics are unchanged: the ORIGINAL
 * lifecycle error drives exit behavior, cleanup always runs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../../cli.js';
import { defineCommand } from '../../command.js';
import { CommandError } from '../../errors.js';
import { definePlugin } from '../../plugin.js';

describe('onError/cleanup hook failure logging', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		exitSpy.mockRestore();
		errorSpy.mockRestore();
	});

	function stderrText(): string {
		return errorSpy.mock.calls
			.map((call) =>
				call.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' '),
			)
			.join('\n');
	}

	it('logs a throwing onError handler, keeps the original error and cleanup', async () => {
		const log: string[] = [];

		const boom = defineCommand({
			meta: { name: 'boom', description: 'Fails' },
			run: () => {
				throw new CommandError('original boom', { exitCode: 1 });
			},
		});

		const plugin = definePlugin({
			meta: { name: 'broken-handler' },
			setup(api) {
				api.hook('onError', () => {
					throw new Error('handler boom');
				});
				api.hook('cleanup', () => {
					log.push('cleanup');
				});
			},
		});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { boom },
			plugins: [plugin],
		});

		await cli.run(['boom']);

		// Handler defect is visible on stderr, including the thrown error
		expect(stderrText()).toContain('onError handler threw:');
		expect(stderrText()).toContain('handler boom');
		// Original error still reported, original exit code still used
		expect(stderrText()).toContain('original boom');
		expect(exitSpy).toHaveBeenCalledWith(1);
		// Cleanup hooks still run
		expect(log).toContain('cleanup');
	});

	it('healthy handler with ctx.handled = true logs nothing and suppresses default output', async () => {
		const boom = defineCommand({
			meta: { name: 'boom', description: 'Fails' },
			run: () => {
				throw new CommandError('original boom');
			},
		});

		const plugin = definePlugin({
			meta: { name: 'healthy-handler' },
			setup(api) {
				api.hook('onError', (ctx) => {
					ctx.handled = true;
				});
			},
		});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { boom },
			plugins: [plugin],
		});

		await cli.run(['boom']);

		expect(stderrText()).not.toContain('onError handler threw:');
		// Existing handled semantics untouched: no default output, no exit
		expect(stderrText()).not.toContain('original boom');
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('logs a throwing cleanup hook without affecting the command result', async () => {
		const runSpy = vi.fn();
		const ok = defineCommand({
			meta: { name: 'ok', description: 'Succeeds' },
			options: { name: z.string().default('world') },
			run: runSpy,
		});

		const plugin = definePlugin({
			meta: { name: 'broken-cleanup' },
			setup(api) {
				api.hook('cleanup', () => {
					throw new Error('cleanup boom');
				});
			},
		});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { ok },
			plugins: [plugin],
		});

		await cli.run(['ok']);

		expect(runSpy).toHaveBeenCalledTimes(1);
		expect(stderrText()).toContain('cleanup hook threw:');
		expect(stderrText()).toContain('cleanup boom');
		// A broken cleanup hook is diagnostic-only: no exit, no error path
		expect(exitSpy).not.toHaveBeenCalled();
	});
});
