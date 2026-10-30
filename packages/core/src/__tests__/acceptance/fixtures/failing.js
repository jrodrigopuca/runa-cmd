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
			meta: { name: 'strict', description: 'strict' },
			options: { port: z.number().default(1) },
			run() {},
		}),
	},
}).run();
