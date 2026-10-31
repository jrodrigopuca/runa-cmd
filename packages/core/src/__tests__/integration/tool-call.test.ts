/**
 * Running a command from an input object, without argv (ADR-0030).
 * The rest of the lifecycle is the one the CLI runs: only how the command and
 * its values are obtained differs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI, runToolCall } from '../../cli.js';
import { defineCommand } from '../../command.js';
import { defineMiddleware } from '../../middleware.js';
import { definePlugin } from '../../plugin.js';
import type { CLIConfig, HookContext, RunContext } from '../../types.js';

describe('runToolCall', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		exitSpy.mockRestore();
		errorSpy.mockRestore();
		delete process.env.TOOL_REGION;
		process.exitCode = undefined;
	});

	const stderr = () => errorSpy.mock.calls.flat().join('\n');

	function capture() {
		const seen: { ctx?: RunContext } = {};
		const command = (overrides: Partial<Parameters<typeof defineCommand>[0]> = {}) =>
			defineCommand({
				meta: { name: 'deploy', description: 'Deploy' },
				...overrides,
				run: (ctx) => {
					seen.ctx = ctx as RunContext;
				},
			} as Parameters<typeof defineCommand>[0]);
		return { seen, command };
	}

	const cliWith = (config: Partial<CLIConfig> & Pick<CLIConfig, 'commands'>): CLIConfig => ({
		meta: { name: 'app' },
		...config,
	});

	describe('selecting the command', () => {
		it('runs a command from an object, without argv', async () => {
			const { seen, command } = capture();
			const deploy = command({
				args: { service: z.string() },
				options: { env: z.string() },
			});

			await runToolCall(cliWith({ commands: { deploy } }), {
				path: ['deploy'],
				input: { service: 'api', env: 'prod' },
			});

			expect(exitSpy).not.toHaveBeenCalled();
			expect(seen.ctx?.args).toEqual({ service: 'api' });
			expect(seen.ctx?.options).toEqual({ env: 'prod' });
			expect(seen.ctx?.rest).toEqual([]);
		});

		it('reaches a nested command by its path', async () => {
			const { seen, command } = capture();
			const set = command({ args: { key: z.string() } });

			await runToolCall(cliWith({ commands: { config: { set } } }), {
				path: ['config', 'set'],
				input: { key: 'a' },
			});

			expect(seen.ctx?.args).toEqual({ key: 'a' });
		});

		it('never reads a value as a route: data stays data', async () => {
			const { seen, command } = capture();
			const deploy = command({ args: { service: z.string() } });
			const other = defineCommand({ meta: { name: 'other', description: 'o' }, run: () => {} });

			await runToolCall(cliWith({ commands: { deploy, other } }), {
				path: ['deploy'],
				input: { service: 'other' },
			});

			expect(seen.ctx?.args).toEqual({ service: 'other' });
		});

		it('fails as command not found on an unknown path', async () => {
			await runToolCall(cliWith({ commands: {} }), { path: ['missing'], input: {} });

			expect(exitSpy).toHaveBeenCalledWith(127);
			expect(stderr()).toContain("Command not found: 'missing'");
		});
	});

	describe('validating the input', () => {
		it('applies schema defaults', async () => {
			const { seen, command } = capture();
			const deploy = command({ options: { size: z.number().default(3) } });

			await runToolCall(cliWith({ commands: { deploy } }), { path: ['deploy'], input: {} });

			expect(seen.ctx?.options).toEqual({ size: 3 });
		});

		it('reports a missing argument as a usage error', async () => {
			const { command } = capture();
			const deploy = command({ args: { service: z.string() } });

			await runToolCall(cliWith({ commands: { deploy } }), { path: ['deploy'], input: {} });

			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(stderr()).toContain('Missing required argument: <service>');
		});

		it('reports a wrong type as a usage error', async () => {
			const { command } = capture();
			const deploy = command({ options: { size: z.number() } });

			await runToolCall(cliWith({ commands: { deploy } }), {
				path: ['deploy'],
				input: { size: 'big' },
			});

			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(stderr()).toContain('Invalid value for --size: expected number');
		});

		it('rejects a key the command does not declare', async () => {
			const { seen, command } = capture();
			const deploy = command({ options: { env: z.string().optional() } });

			await runToolCall(cliWith({ commands: { deploy } }), {
				path: ['deploy'],
				input: { evn: 'prod' },
			});

			expect(exitSpy).toHaveBeenCalledWith(2);
			expect(stderr()).toContain('Unknown input: evn');
			expect(seen.ctx).toBeUndefined();
		});

		it('runs a transform exactly once', async () => {
			const { seen, command } = capture();
			const transform = vi.fn((value: string) => value.toUpperCase());
			const deploy = command({
				args: { service: z.string().transform(transform) },
				options: { env: z.string().transform(transform) },
			});

			await runToolCall(cliWith({ commands: { deploy } }), {
				path: ['deploy'],
				input: { service: 'api', env: 'prod' },
			});

			expect(transform).toHaveBeenCalledTimes(2);
			expect(seen.ctx?.args).toEqual({ service: 'API' });
			expect(seen.ctx?.options).toEqual({ env: 'PROD' });
		});
	});

	describe('values that argv cannot carry', () => {
		it.each([
			['an array option', { tags: z.array(z.string()) }, { tags: ['a', 'b'] }],
			['an object option', { filter: z.object({ age: z.number() }) }, { filter: { age: 3 } }],
			['a number option', { size: z.number() }, { size: 0 }],
			['a boolean false', { force: z.boolean() }, { force: false }],
			['text starting with dashes', { note: z.string() }, { note: '--force' }],
		])('takes %s', async (_case, options, input) => {
			const { seen, command } = capture();
			const deploy = command({ options });

			await runToolCall(cliWith({ commands: { deploy } }), { path: ['deploy'], input });

			expect(exitSpy).not.toHaveBeenCalled();
			expect(seen.ctx?.options).toEqual(input);
		});

		it.each([
			['a number positional', { port: z.number() }, { port: 8080 }],
			['a variadic', { files: z.array(z.string()) }, { files: ['a', 'b'] }],
		])('takes %s', async (_case, args, input) => {
			const { seen, command } = capture();
			const deploy = command({ args });

			await runToolCall(cliWith({ commands: { deploy } }), { path: ['deploy'], input });

			expect(exitSpy).not.toHaveBeenCalled();
			expect(seen.ctx?.args).toEqual(input);
		});
	});

	describe('the same lifecycle as the CLI', () => {
		it('runs hooks and middleware in order, and cleanup at the end', async () => {
			const log: string[] = [];
			const trace = (name: string) => () => {
				log.push(name);
			};

			const plugin = definePlugin({
				meta: { name: 'trace' },
				setup(api) {
					for (const hook of ['afterParse', 'beforeRun', 'afterRun', 'cleanup'] as const) {
						api.hook(hook, trace(hook));
					}
				},
				cleanup: trace('plugin-cleanup'),
			});
			const middleware = defineMiddleware(async ({ next }) => {
				log.push('middleware:before');
				await next();
				log.push('middleware:after');
			});
			const deploy = defineCommand({
				meta: { name: 'deploy', description: 'Deploy' },
				run: trace('run'),
			});

			await runToolCall(
				cliWith({ commands: { deploy }, plugins: [plugin], middleware: [middleware] }),
				{ path: ['deploy'], input: {} },
			);

			expect(log).toEqual([
				'afterParse',
				'beforeRun',
				'middleware:before',
				'run',
				'middleware:after',
				'afterRun',
				'cleanup',
				'plugin-cleanup',
			]);
		});

		it('lets a middleware stop the command', async () => {
			const run = vi.fn();
			const deny = defineMiddleware(async () => {
				throw new Error('not allowed');
			});
			const deploy = defineCommand({ meta: { name: 'deploy', description: 'Deploy' }, run });

			await runToolCall(cliWith({ commands: { deploy }, middleware: [deny] }), {
				path: ['deploy'],
				input: {},
			});

			expect(run).not.toHaveBeenCalled();
			expect(exitSpy).toHaveBeenCalledWith(1);
		});

		it('validates output like the CLI', async () => {
			const deploy = defineCommand({
				meta: { name: 'deploy', description: 'Deploy' },
				output: z.object({ url: z.string() }),
				run: () => ({ url: 1 }) as never,
			});

			await runToolCall(cliWith({ commands: { deploy } }), { path: ['deploy'], input: {} });

			expect(stderr()).toContain("Command 'deploy' returned invalid output");
		});

		it('reads startup globals from argv', async () => {
			const { seen, command } = capture();

			await runToolCall(
				cliWith({
					commands: { deploy: command() },
					globalOptions: { profile: z.string().optional() },
				}),
				{ path: ['deploy'], input: {} },
				{ argv: ['--profile', 'prod'] },
			);

			expect(seen.ctx?.globalOptions).toEqual({ profile: 'prod' });
		});

		it('fills what the input omits from env, then config', async () => {
			process.env.TOOL_REGION = 'from-env';
			const { seen, command } = capture();
			const deploy = command({
				meta: {
					name: 'deploy',
					description: 'Deploy',
					options: { region: { env: 'TOOL_REGION' } },
				},
				options: { region: z.string() },
			});

			await runToolCall(cliWith({ commands: { deploy } }), { path: ['deploy'], input: {} });

			expect(seen.ctx?.options).toEqual({ region: 'from-env' });
		});

		it('warns about a deprecated option in the input', async () => {
			const { command } = capture();
			const deploy = command({
				meta: {
					name: 'deploy',
					description: 'Deploy',
					options: { force: { deprecated: 'Use --confirm instead' } },
				},
				options: { force: z.boolean().optional() },
			});

			await runToolCall(cliWith({ commands: { deploy } }), {
				path: ['deploy'],
				input: { force: true },
			});

			expect(stderr()).toContain('Warning: --force is deprecated');
		});
	});

	describe('invocation', () => {
		const recordInvocation = (seen: HookContext['invocation'][]) =>
			definePlugin({
				meta: { name: 'invocation' },
				setup(api) {
					api.hook('beforeRun', (ctx) => {
						seen.push(ctx.invocation);
					});
				},
			});

		it('tells hooks the call comes from a tool', async () => {
			const seen: HookContext['invocation'][] = [];
			const set = defineCommand({ meta: { name: 'set', description: 's' }, run: () => {} });

			await runToolCall(
				cliWith({ commands: { config: { set } }, plugins: [recordInvocation(seen)] }),
				{ path: ['config', 'set'], input: {} },
			);

			expect(seen).toEqual([{ surface: 'tool', tool: 'config_set' }]);
		});

		it('tells hooks the call comes from the CLI', async () => {
			const seen: HookContext['invocation'][] = [];
			const deploy = defineCommand({ meta: { name: 'deploy', description: 'd' }, run: () => {} });
			const other = defineCommand({ meta: { name: 'other', description: 'o' }, run: () => {} });

			await defineCLI(
				cliWith({ commands: { deploy, other }, plugins: [recordInvocation(seen)] }),
			).run(['deploy']);

			expect(seen).toEqual([{ surface: 'cli' }]);
		});
	});
});
