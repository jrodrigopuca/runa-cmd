/**
 * Integration tests for strict unknown-option rejection (task 2.5)
 *
 * Tests the wired lifecycle: cli.run() with injected argv → command parseArgs
 * → assertKnownOptions → ValidationError (exit 2) with did-you-mean.
 *
 * References: specs.md Requirement 1.2 (all scenarios) + "Strict Options
 * Escape Hatch" (both scenarios); design.md D3/D4.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../../cli.js';
import { defineCommand } from '../../command.js';
import { definePlugin } from '../../plugin.js';
import type { CLIConfig } from '../../types.js';

// ─── Helpers ────────────────────────────────────────────────

function mockProcessExit() {
	const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
	const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	return { exitSpy, errorSpy };
}

/** All stderr output captured by the console.error spy, joined */
function stderrOutput(errorSpy: ReturnType<typeof mockProcessExit>['errorSpy']): string {
	return errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
}

describe('strict options integration', () => {
	let spies: ReturnType<typeof mockProcessExit>;

	beforeEach(() => {
		spies = mockProcessExit();
	});

	afterEach(() => {
		spies.exitSpy.mockRestore();
		spies.errorSpy.mockRestore();
	});

	// Shared deploy command: --force (bool), --replicas (number),
	// --environment (alias -e/--env), --verbose (bool, negatable)
	function makeDeploy(capture?: { options?: Record<string, unknown> }) {
		return defineCommand({
			meta: {
				name: 'deploy',
				description: 'Deploy the app',
				options: {
					environment: { alias: ['-e', '--env'] },
				},
			},
			options: {
				force: z.boolean().default(false),
				replicas: z.number().default(3),
				environment: z.string().default('staging'),
				verbose: z.boolean().default(true),
			},
			run: (ctx) => {
				if (capture) {
					capture.options = ctx.options;
				}
			},
		});
	}

	function makeCLI(config?: Partial<CLIConfig>, capture?: { options?: Record<string, unknown> }) {
		return defineCLI({
			meta: { name: 'mycli' },
			commands: { deploy: makeDeploy(capture), status: statusCmd },
			...config,
		});
	}

	const statusCmd = defineCommand({
		meta: { name: 'status', description: 'Show status' },
		run: () => {},
	});

	it('deploy --forse → ValidationError, exit 2, names the flag and suggests --force', async () => {
		const cli = makeCLI();
		await cli.run(['deploy', '--forse']);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		const stderr = stderrOutput(spies.errorSpy);
		expect(stderr).toContain('Unknown option: --forse');
		expect(stderr).toContain("Did you mean '--force'?");
	});

	it('deploy --zzzzzzzzzz → error naming the flag, NO suggestion clause', async () => {
		const cli = makeCLI();
		await cli.run(['deploy', '--zzzzzzzzzz']);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		const stderr = stderrOutput(spies.errorSpy);
		expect(stderr).toContain('Unknown option: --zzzzzzzzzz');
		expect(stderr).not.toContain('Did you mean');
	});

	it('declared aliases are not unknown: -e prod', async () => {
		const capture: { options?: Record<string, unknown> } = {};
		const cli = makeCLI({}, capture);
		await cli.run(['deploy', '-e', 'prod']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.options?.['environment']).toBe('prod');
	});

	it('declared aliases are not unknown: --env prod', async () => {
		const capture: { options?: Record<string, unknown> } = {};
		const cli = makeCLI({}, capture);
		await cli.run(['deploy', '--env', 'prod']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.options?.['environment']).toBe('prod');
	});

	it('boolean negation is not unknown: --no-verbose → verbose === false', async () => {
		const capture: { options?: Record<string, unknown> } = {};
		const cli = makeCLI({}, capture);
		await cli.run(['deploy', '--no-verbose']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.options?.['verbose']).toBe(false);
	});

	describe('with a help-style plugin registering global --help/-h', () => {
		let helpRendered: boolean;
		let deployRan: boolean;

		function makeHelpStylePlugin() {
			return definePlugin({
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
		}

		function makeCLIWithHelp() {
			const deploy = defineCommand({
				meta: { name: 'deploy', description: 'Deploy the app' },
				options: { force: z.boolean().default(false) },
				run: () => {
					deployRan = true;
				},
			});
			return defineCLI({
				meta: { name: 'mycli' },
				commands: { deploy, status: statusCmd },
				plugins: [makeHelpStylePlugin()],
			});
		}

		beforeEach(() => {
			helpRendered = false;
			deployRan = false;
		});

		it('deploy --help is consumed by global extraction — no unknown-option error', async () => {
			const cli = makeCLIWithHelp();
			await cli.run(['deploy', '--help']);

			expect(spies.exitSpy).not.toHaveBeenCalled();
			expect(helpRendered).toBe(true);
			expect(deployRan).toBe(false);
		});

		it('deploy --hepl → ValidationError suggesting --help (globals in candidate set)', async () => {
			const cli = makeCLIWithHelp();
			await cli.run(['deploy', '--hepl']);

			expect(spies.exitSpy).toHaveBeenCalledWith(2);
			const stderr = stderrOutput(spies.errorSpy);
			expect(stderr).toContain('Unknown option: --hepl');
			expect(stderr).toContain("Did you mean '--help'?");
			expect(deployRan).toBe(false);
		});
	});

	it('--opt=value form: deploy --replcias=3 → error naming --replcias, suggesting --replicas', async () => {
		const cli = makeCLI();
		await cli.run(['deploy', '--replcias=3']);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		const stderr = stderrOutput(spies.errorSpy);
		expect(stderr).toContain('Unknown option: --replcias');
		expect(stderr).toContain("Did you mean '--replicas'?");
	});

	it('strictOptions: false → unknown flags tolerated, defined flags still parse', async () => {
		const capture: { options?: Record<string, unknown> } = {};
		const cli = makeCLI({ strictOptions: false }, capture);
		await cli.run(['deploy', '--typo-flag', '--force']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(capture.options?.['force']).toBe(true);
		expect(capture.options).not.toHaveProperty('typo-flag');
	});

	it('default (no strictOptions field) → strict applies', async () => {
		const cli = makeCLI();
		await cli.run(['deploy', '--typo-flag']);

		expect(spies.exitSpy).toHaveBeenCalledWith(2);
		expect(stderrOutput(spies.errorSpy)).toContain('Unknown option: --typo-flag');
	});

	it('tokens after -- are exempt from strict checking', async () => {
		// Spec 1.2 exemption scenario: the rest split (task 2.6, design D5)
		// removes post-`--` tokens from the pipeline BEFORE parseArgs, so the
		// strict check can never flag them — they arrive verbatim on ctx.rest,
		// never as positionals. Full rest semantics: integration/rest-args.test.ts.
		let receivedParts: unknown;
		let receivedRest: unknown;
		const exec = defineCommand({
			meta: { name: 'exec', description: 'Run a command' },
			args: { parts: z.array(z.string()) },
			run: (ctx) => {
				receivedParts = ctx.args['parts'];
				receivedRest = ctx.rest;
			},
		});
		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { exec, status: statusCmd },
		});

		await cli.run(['exec', '--', '--not-a-defined-flag']);

		expect(spies.exitSpy).not.toHaveBeenCalled();
		expect(receivedParts).toEqual([]);
		expect(receivedRest).toEqual(['--not-a-defined-flag']);
	});
});
