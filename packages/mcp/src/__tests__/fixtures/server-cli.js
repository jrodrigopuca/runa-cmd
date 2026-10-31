// A real CLI served over MCP, whose commands exercise each promise of ADR-0030.
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
		api.hook('afterRun', () => trace('afterRun'));
		api.hook('cleanup', () => trace('cleanup'));
	},
});

const selfCommand = process.env.SELF_COMMAND ? JSON.parse(process.env.SELF_COMMAND) : undefined;
const command = (name, config) =>
	defineCommand({ meta: { name, description: `The ${name} tool` }, ...config });

await defineCLI({
	meta: { name: 'server', version: '1.0.0' },
	globalOptions: { profile: z.string().default('default') },
	middleware: [gate],
	plugins: [lifecycle, mcpPlugin({ selfCommand })],
	commands: {
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
