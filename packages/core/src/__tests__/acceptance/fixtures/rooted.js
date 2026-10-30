// A single-command CLI with a plugin that adds a subcommand, the way
// completionsPlugin does. Exercises the explicit root mode of runCLI.
import { defineCommand, definePlugin, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const addsSync = definePlugin({
	meta: { name: 'adds-sync' },
	capabilities: { addCommands: true },
	setup(api) {
		api.addCommand(
			'sync',
			defineCommand({
				meta: { name: 'sync', description: 'sync' },
				run: () => console.log('ran sync'),
			}),
		);
		api.hook('beforeRun', () => console.log('plugin hook ran'));
	},
});

const tool = defineCommand({
	meta: { name: 'tool', version: '2.0.0', description: 'Sample tool' },
	args: { content: z.string() },
	run: ({ args }) => console.log(`content: ${args.content}`),
});

await runCLI(tool, { plugins: [addsSync] });
