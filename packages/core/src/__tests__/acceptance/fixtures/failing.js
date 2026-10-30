// A real CLI whose commands fail in every way the exit path must explain.
import { setTimeout as delay } from 'node:timers/promises';
import { CommandError, defineCLI, defineCommand, definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const failing = (name, run) => defineCommand({ meta: { name, description: name }, run });

const cleanupProbe = definePlugin({
	meta: { name: 'cleanup-probe', version: '1.0.0' },
	setup(api) {
		api.hook('cleanup', async () => {
			await delay(5);
			console.log('cleanup-hook');
		});
	},
	async cleanup() {
		await delay(5);
		console.log('plugin-cleanup');
	},
});

const plugins = [cleanupProbe];

if (process.env.PLUGIN_HANDLES || process.env.PLUGIN_RECOVERS) {
	plugins.push(
		definePlugin({
			meta: { name: 'handler', version: '1.0.0' },
			setup(api) {
				api.hook('onError', (ctx) => {
					console.error('plugin says: it broke');
					ctx.handled = true;
					if (process.env.PLUGIN_RECOVERS) process.exitCode = 0;
				});
			},
		}),
	);
}

// Stands in for any plugin that gives the CLI a --help option.
if (process.env.HAS_HELP) {
	plugins.push(
		definePlugin({
			meta: { name: 'help-option' },
			capabilities: { addGlobalOptions: true },
			setup(api) {
				api.addGlobalOption('help', z.boolean().default(false));
			},
		}),
	);
}

if (process.env.PLUGIN_CRASHES) {
	plugins.push(
		definePlugin({
			meta: { name: 'crash', version: '1.0.0' },
			setup() {
				throw new Error('plugin exploded');
			},
		}),
	);
}

await defineCLI({
	meta: { name: 'app' },
	plugins,
	globalOptions: { profile: z.string().optional() },
	commands: {
		plain: failing('plain', () => {
			throw new Error('kaboom');
		}),
		caused: failing('caused', () => {
			throw new Error('kaboom', { cause: new Error('disk full') });
		}),
		expected: failing('expected', () => {
			throw new CommandError('Environment is locked', { code: 'ENV_LOCKED', exitCode: 3 });
		}),
		empty: failing('empty', () => {
			throw new Error('');
		}),
		'empty-expected': failing('empty-expected', () => {
			throw new CommandError('', { exitCode: 3 });
		}),
		nothing: failing('nothing', () => {
			throw undefined;
		}),
		text: failing('text', () => {
			throw 'just text';
		}),
		strict: defineCommand({
			meta: {
				name: 'strict',
				description: 'strict',
				options: { label: { alias: ['-l', '--tag'] } },
			},
			options: {
				port: z.number().default(1),
				label: z.string().optional(),
				level: z.enum(['low', 'high']).optional(),
			},
			run() {},
		}),
		required: defineCommand({
			meta: { name: 'required', description: 'required' },
			args: { target: z.string().describe('Where to go') },
			options: { token: z.string().describe('Secret token') },
			run() {},
		}),
		'bad-output': defineCommand({
			meta: { name: 'bad-output', description: 'bad output' },
			output: z.object({ url: z.string() }),
			run: () => ({ url: 1 }),
		}),
		legacy: defineCommand({
			meta: {
				name: 'legacy',
				description: 'legacy',
				options: {
					force: {
						alias: ['--yes'],
						env: 'LEGACY_FORCE',
						deprecated: 'Use --confirm instead',
					},
					port: { deprecated: 'Set it in the config file' },
				},
			},
			options: {
				force: z.boolean().default(false),
				confirm: z.boolean().default(false),
				port: z.number().optional(),
			},
			run: ({ options }) => console.log(JSON.stringify(options)),
		}),
	},
}).run();
