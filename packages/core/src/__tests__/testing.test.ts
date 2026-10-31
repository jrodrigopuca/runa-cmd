/**
 * testCLI() runs the real lifecycle in this process (ADR-0041, ADR-0045).
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { CommandError } from '../errors.js';
import { defineMiddleware } from '../middleware.js';
import { definePlugin } from '../plugin.js';
import { testCLI } from '../testing.js';

const pause = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));

const say = defineCommand({
	meta: { name: 'say', description: 'Print in steps' },
	args: { id: z.string() },
	async run({ args }) {
		for (let step = 0; step < 4; step++) {
			console.log(`${args.id}:${step}`);
			await pause();
			console.error(`${args.id}:${step}`);
		}
	},
});
const sum = defineCommand({
	meta: { name: 'sum', description: 'Return a value' },
	options: { by: z.number().default(1) },
	output: z.object({ total: z.number() }),
	run: ({ options }) => ({ total: options.by + 1 }),
});
const fail = defineCommand({
	meta: { name: 'fail', description: 'Fail' },
	run() {
		console.log('before');
		throw new CommandError('it broke', { exitCode: 3, code: 'BROKEN' });
	},
});
const quit = defineCommand({
	meta: { name: 'quit', description: 'Leave by itself' },
	run() {
		console.log('leaving');
		process.exit(7);
		console.log('never');
	},
});
const deploy = defineCommand({
	meta: {
		name: 'deploy',
		description: 'Uses every source',
		options: { token: { env: 'TOKEN' }, region: { env: 'REGION' } },
	},
	options: {
		token: z.string().optional(),
		region: z.string().optional(),
		bucket: z.string().optional(),
		note: z.string().optional(),
		retries: z.number().default(3),
	},
	run: ({ options }) => console.log(JSON.stringify(options)),
});

const calls: string[] = [];
const tracker = definePlugin({
	meta: { name: 'tracker', version: '1.0.0' },
	setup(api) {
		api.hook('beforeRun', () => {
			calls.push('beforeRun');
		});
		api.hook('cleanup', () => {
			calls.push('cleanup');
		});
	},
});

const cli = defineCLI({
	meta: { name: 'demo', version: '1.2.3' },
	commands: { say, sum, fail, quit, deploy, group: { sum } },
	globalOptions: { store: z.string().default('notes.json') },
	globalMeta: { options: { store: { env: 'STORE' } } },
	config: { name: 'demo-does-not-exist' },
	plugins: [tracker],
});

const optionsOf = (trace: Awaited<ReturnType<typeof testCLI>>['trace']) =>
	trace.filter((event) => event.step === 'option');

describe('what a run returns', () => {
	it('gives the exit code, the output and what the command returned', async () => {
		const result = await testCLI(cli, ['sum', '--by', '2']);

		expect(result.code).toBe(0);
		expect(result.result).toEqual({ total: 3 });
		expect(result.error).toBeUndefined();
	});

	it('survives a failure, and gives the original error', async () => {
		const result = await testCLI(cli, ['fail']);

		expect(result.code).toBe(3);
		expect(result.stdout).toBe('before\n');
		expect(result.stderr).toContain('it broke');
		expect(result.error).toBeInstanceOf(CommandError);
		expect(result.error).toMatchObject({ code: 'BROKEN' });
	});

	it('gives exit 2 for a usage error, as a real run', async () => {
		const result = await testCLI(cli, ['sum', '--nope']);
		expect(result.code).toBe(2);
		expect(result.stderr).toContain('--nope');
	});

	it('gives the output of --version and --help', async () => {
		expect((await testCLI(cli, ['--version'])).stdout).toBe('1.2.3\n');
		expect((await testCLI(cli, ['--help'])).stdout).toContain('USAGE');
	});

	it('runs a single command, as runCLI does', async () => {
		const result = await testCLI(sum, ['--by', '4']);
		expect(result.result).toEqual({ total: 5 });
	});

	it('takes plugins and middleware for a single command', async () => {
		const seen: string[] = [];
		const timing = defineMiddleware(async ({ next }) => {
			seen.push('before');
			await next();
		});

		await testCLI(sum, [], { middleware: [timing] });
		expect(seen).toEqual(['before']);
	});
});

describe('a command that calls process.exit', () => {
	it('stops there, with its code', async () => {
		const result = await testCLI(cli, ['quit']);

		expect(result.code).toBe(7);
		expect(result.stdout).toBe('leaving\n');
		expect(result.stderr).toBe('');
	});

	it('skips cleanup, as a real exit does', async () => {
		calls.length = 0;
		await testCLI(cli, ['quit']);
		expect(calls).toEqual(['beforeRun']);
	});
});

describe('the lifecycle is the real one', () => {
	it('runs cleanup after a failure', async () => {
		calls.length = 0;
		await testCLI(cli, ['fail']);
		expect(calls).toEqual(['beforeRun', 'cleanup']);
	});
});

describe('the environment of the test', () => {
	it('reads the env it is given, not the one of the machine', async () => {
		vi.stubEnv('TOKEN', 'from-the-machine');
		const result = await testCLI(cli, ['deploy'], { env: { REGION: 'eu' } });
		vi.unstubAllEnvs();

		expect(JSON.parse(result.stdout)).toEqual({ region: 'eu', retries: 3 });
	});

	it('reads the config it is given, without files', async () => {
		const result = await testCLI(cli, ['deploy'], {
			config: { store: 'cfg.json', deploy: { bucket: 'b' } },
		});

		expect(JSON.parse(result.stdout)).toMatchObject({ bucket: 'b' });
		expect(result.code).toBe(0);
	});

	it('rejects a config the real CLI would reject', async () => {
		const result = await testCLI(cli, ['deploy'], { config: { deploy: { nope: 1 } } });

		expect(result.code).toBe(2);
		expect(result.stderr).toContain("'deploy.nope'");
	});
});

describe('the trace', () => {
	it('says where each value came from', async () => {
		const { trace } = await testCLI(cli, ['deploy', '--note', 'typed'], {
			env: { REGION: 'eu' },
			config: { deploy: { bucket: 'b' } },
		});

		expect(optionsOf(trace)).toEqual(
			expect.arrayContaining([
				{ step: 'option', name: 'note', scope: 'command', source: 'cli', value: 'typed' },
				{ step: 'option', name: 'region', scope: 'command', source: 'env' },
				{ step: 'option', name: 'bucket', scope: 'command', source: 'config', value: 'b' },
				{ step: 'option', name: 'retries', scope: 'command', source: 'default', value: 3 },
				{ step: 'option', name: 'store', scope: 'global', source: 'default', value: 'notes.json' },
			]),
		);
	});

	it('never carries a value from env, which can be a secret', async () => {
		const secret = 'sk-very-secret-value';
		const { trace } = await testCLI(cli, ['sum'], { env: { STORE: secret } });

		expect(JSON.stringify(trace)).not.toContain(secret);
		expect(optionsOf(trace)).toContainEqual({
			step: 'option',
			name: 'store',
			scope: 'global',
			source: 'env',
		});
	});

	it('says which hooks ran, and how long they took', async () => {
		const { trace } = await testCLI(cli, ['sum']);
		const hooks = trace.filter((event) => event.step === 'hook');

		expect(hooks.map((event) => event.name)).toEqual(['beforeRun', 'cleanup']);
		for (const hook of hooks) expect(hook.ms).toBeGreaterThanOrEqual(0);
	});

	it('says which command ran, with its whole path', async () => {
		const { trace } = await testCLI(cli, ['group', 'sum']);
		expect(trace).toContainEqual(
			expect.objectContaining({ step: 'run', command: ['group', 'sum'] }),
		);
	});

	it('keeps stdout and stderr in the order they were written', async () => {
		const { trace } = await testCLI(cli, ['say', 'a']);
		const output = trace.filter((event) => event.step === 'output');

		expect(output.slice(0, 3).map((event) => event.stream)).toEqual(['stdout', 'stderr', 'stdout']);
	});
});

describe('running at the same time', () => {
	const ids = Array.from({ length: 40 }, (_, index) => `run${index}`);

	it('keeps each output apart', async () => {
		const results = await Promise.all(ids.map((id) => testCLI(cli, ['say', id])));

		results.forEach((result, index) => {
			const lines = result.stdout.trim().split('\n');
			expect(lines).toHaveLength(4);
			expect(lines.every((line) => line.startsWith(`${ids[index]}:`))).toBe(true);
			expect(result.stderr.startsWith(`${ids[index]}:`)).toBe(true);
		});
	});

	it('leaves no signal listeners, and no warnings about them', async () => {
		const warnings: string[] = [];
		const onWarning = (warning: Error) => warnings.push(warning.name);
		process.on('warning', onWarning);
		const before = process.listenerCount('SIGINT');

		await Promise.all(ids.map((id) => testCLI(cli, ['say', id])));
		await new Promise((resolve) => setImmediate(resolve));
		process.off('warning', onWarning);

		expect(process.listenerCount('SIGINT')).toBe(before);
		expect(warnings).toEqual([]);
	});

	it('hands the output back to whoever had it', async () => {
		const { write } = process.stdout;
		const { log } = console;
		const realExit = process.exit;

		await testCLI(cli, ['sum']);

		expect(process.stdout.write).toBe(write);
		expect(console.log).toBe(log);
		expect(process.exit).toBe(realExit);
	});
});
