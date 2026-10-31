// A real CLI that gets stopped from outside while each command behaves differently.
import { setTimeout as delay } from 'node:timers/promises';
import { defineCLI, defineCommand, definePlugin } from '@runa-cmd/core';

const WAIT_MS = 30_000;

const command = (name, run) => defineCommand({ meta: { name, description: name }, run });

const probe = definePlugin({
	meta: { name: 'probe', version: '1.0.0' },
	setup(api) {
		api.hook('onError', (ctx) => console.log(`onError:${ctx.error.code}`));
		api.hook('cleanup', async (ctx) => {
			console.log(`cleanup:${ctx.signal.aborted}`);
			if (process.env.CLEANUP_HANGS) await delay(WAIT_MS);
		});
	},
});

await defineCLI({
	meta: { name: 'stopping', version: '1.0.0' },
	plugins: [probe],
	commands: {
		cooperative: command('cooperative', async ({ signal }) => {
			console.log('ready');
			await delay(WAIT_MS, undefined, { signal });
		}),
		ignores: command('ignores', async () => {
			console.log('ready');
			await delay(WAIT_MS);
		}),
		'finishes-anyway': command('finishes-anyway', async ({ signal }) => {
			console.log('ready');
			const alive = setInterval(() => {}, 1000);
			await new Promise((resolve) => signal.addEventListener('abort', resolve));
			clearInterval(alive);
		}),
		quick: command('quick', ({ signal }) => console.log(`quick:${signal.aborted}`)),
	},
}).run();
