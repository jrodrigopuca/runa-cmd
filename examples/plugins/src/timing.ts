import { definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

/** Adds --timing, which says how long each command took, on stderr. */
export function timingPlugin() {
	let started = 0;

	return definePlugin({
		meta: { name: 'timing', description: 'Says how long a command took' },
		// Each thing a plugin adds to the CLI is declared up front
		capabilities: { addGlobalOptions: true },
		setup(api) {
			api.addGlobalOption('timing', z.boolean().default(false).describe('Say how long it took'));

			api.hook('beforeRun', () => {
				started = performance.now();
			});
			api.hook('afterRun', (ctx) => {
				// In a tool call, stderr reaches the model too: keep it for people
				if (!ctx.globalOptions?.timing || ctx.invocation.surface === 'tool') return;
				const ms = Math.round(performance.now() - started);
				console.error(`${ctx.command?.path.join(' ')} took ${ms} ms`);
			});
		},
	});
}
