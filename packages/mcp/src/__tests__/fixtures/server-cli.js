// A real CLI served over MCP, whose commands exercise each promise of ADR-0030.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import {
	CommandError,
	defineCLI,
	defineCommand,
	defineMiddleware,
	definePlugin,
} from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { mcpPlugin } from '../../../dist/index.js';

const trace = (line) => {
	if (process.env.TRACE_FILE) appendFileSync(process.env.TRACE_FILE, `${line}\n`);
};

const gate = defineMiddleware(async ({ next, globalOptions }) => {
	trace(`middleware:before:${globalOptions.profile}`);
	if (process.env.MIDDLEWARE_REJECTS) throw new CommandError('Not allowed here');
	if (process.env.MIDDLEWARE_SKIPS) return;
	await next();
	trace('middleware:after');
});

const lifecycle = definePlugin({
	meta: { name: 'lifecycle' },
	setup(api) {
		api.hook('beforeRun', (ctx) => {
			trace(`beforeRun:${ctx.invocation.surface}:${ctx.invocation.tool}`);
		});
		api.hook('afterRun', () => {
			trace('afterRun');
			if (process.env.AFTER_RUN_FAILS) throw new Error('telemetry is down');
		});
		api.hook('cleanup', () => trace('cleanup'));
	},
});

const WAIT_MS = 30_000;

/** A process the command starts: its pid goes to the trace, to look for it from outside. */
function startGrandchild(stdio, detached = false) {
	const grandchild = spawn(process.execPath, ['-e', `setTimeout(() => {}, ${WAIT_MS})`], {
		stdio,
		detached,
	});
	grandchild.unref();
	trace(`grandchild:${grandchild.pid}`);
}

const selfCommand = process.env.SELF_COMMAND ? JSON.parse(process.env.SELF_COMMAND) : undefined;
const tools = process.env.TOOLS ? JSON.parse(process.env.TOOLS) : undefined;
const maxOutput = process.env.MAX_OUTPUT ? Number(process.env.MAX_OUTPUT) : undefined;
const exclude = process.env.EXCLUDE ? JSON.parse(process.env.EXCLUDE) : undefined;
const command = (name, config) =>
	defineCommand({ meta: { name, description: `The ${name} tool` }, ...config });

await defineCLI({
	meta: { name: 'server', version: '1.0.0' },
	globalOptions: { profile: z.string().default('default') },
	config: process.env.CONFIG_DIR
		? { name: 'server', searchPaths: [process.env.CONFIG_DIR] }
		: undefined,
	middleware: [gate],
	plugins: [lifecycle, mcpPlugin({ selfCommand, tools, maxOutput, exclude })],
	commands: {
		operated: command('operated', {
			meta: {
				name: 'operated',
				description: 'Uses values the operator may fix',
				options: {
					region: { env: 'TEST_REGION' },
					token: { env: 'TEST_TOKEN' },
				},
			},
			args: { service: z.string() },
			options: {
				region: z.string().default('default-region'),
				token: z.string(),
				bucket: z.string().default('default-bucket'),
				note: z.string().optional(),
			},
			run: ({ args, options }) => ({ service: args.service, ...options }),
		}),
		leaky: command('leaky', {
			meta: {
				name: 'leaky',
				description: 'Prints and fails with its secret',
				options: { token: { env: 'TEST_TOKEN' } },
			},
			options: { token: z.string() },
			run({ options }) {
				console.log(`using ${options.token}`);
				if (process.env.LEAK_FAILS) throw new CommandError(`rejected ${options.token}`);
			},
		}),
		deploy: command('deploy', {
			args: { service: z.string().describe('Service to deploy') },
			options: {
				env: z.enum(['staging', 'production']).default('staging'),
				replicas: z.number().optional(),
			},
			output: z.object({ url: z.string(), profile: z.string() }),
			run({ args, options, globalOptions }) {
				console.log('Deploying: logs must stay out of the protocol');
				return {
					url: `https://${options.env}.example.com/${args.service}`,
					profile: globalOptions.profile,
				};
			},
		}),
		whoami: command('whoami', {
			run: ({ globalOptions }) => console.log(`profile ${globalOptions.profile}`),
		}),
		greet: command('greet', {
			args: { name: z.string() },
			run: ({ args }) => console.log(`Hello ${args.name}`),
		}),
		both: command('both', {
			run() {
				console.log('progress noise');
				return 'the answer';
			},
		}),
		quiet: command('quiet', { run() {} }),
		fail: command('fail', {
			run() {
				throw new CommandError('Environment is locked', { exitCode: 3 });
			},
		}),
		partial: command('partial', {
			run() {
				trace('charged the card');
				throw new Error('then the network failed');
			},
		}),
		charged: command('charged', {
			output: z.object({ receipt: z.string() }),
			run() {
				trace('charged the card');
				return { receipt: 42 };
			},
		}),
		waits: command('waits', {
			async run({ signal }) {
				startGrandchild('ignore');
				trace('waiting');
				await delay(WAIT_MS, undefined, { signal });
			},
		}),
		stubborn: command('stubborn', {
			async run() {
				startGrandchild('ignore');
				trace('waiting');
				await delay(WAIT_MS);
			},
		}),
		talkative: command('talkative', {
			async run({ signal }) {
				process.on('disconnect', () => trace('disconnected'));
				trace('waiting');
				while (!signal.aborted) {
					console.log('still working');
					await delay(5);
				}
				console.log('one last line');
				trace('survived the closed pipes');
			},
		}),
		daemon: command('daemon', {
			run() {
				startGrandchild('inherit', true); // On Windows, it can only outlive this process detached
				return 'started';
			},
		}),
		loud: command('loud', {
			args: { megabytes: z.number() },
			async run({ args }) {
				const chunk = Buffer.alloc(1024 * 1024, 'x');
				process.stdout.write('START');
				for (let sent = 0; sent < args.megabytes; sent++) {
					if (!process.stdout.write(chunk)) await once(process.stdout, 'drain');
				}
				process.stdout.write('END');
			},
		}),
		echoes: command('echoes', {
			args: { before: z.number(), after: z.number() },
			options: { secret: z.string() },
			meta: {
				name: 'echoes',
				description: 'Prints a value the operator fixed at any position',
				options: { secret: { env: 'TEST_TOKEN' } },
			},
			run({ args, options }) {
				console.log(`${'x'.repeat(args.before)}${options.secret}${'y'.repeat(args.after)}`);
			},
		}),
		big: command('big', {
			args: { size: z.number() },
			run: ({ args }) => 'x'.repeat(args.size),
		}),
		paint: command('paint', {
			options: { darkColor: z.string() },
			run: ({ options }) => options.darkColor,
		}),
		crash: command('crash', { run: () => process.exit(9) }),
		leave: command('leave', { run: () => process.exit(0) }),
		slow: command('slow', {
			args: { label: z.string() },
			async run({ args }) {
				console.log(`start ${args.label}`);
				await delay(300);
				console.log(`end ${args.label}`);
			},
		}),
		shout: command('shout', {
			args: { word: z.string().transform((value) => `${value}!`) },
			run: ({ args }) => args.word,
		}),
		shapes: command('shapes', {
			args: { port: z.number() },
			options: {
				tags: z.array(z.string()).optional(),
				filter: z.object({ age: z.number() }).optional(),
			},
			run: ({ args, options }) => ({ ...args, ...options }),
		}),
		internals: command('internals', {
			run: () => Object.keys(process.env).filter((key) => key.startsWith('RUNA_INTERNAL')),
		}),
		config: {
			set: command('set', {
				args: { key: z.string() },
				run: ({ args }) => `set ${args.key}`,
			}),
		},
	},
}).run();
