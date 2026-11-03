// A defineCLI with one command: it routes as any other (ADR-0023).
import { defineCLI, defineCommand, definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const tool = defineCommand({
	meta: { name: 'tool', description: 'Sample tool' },
	args: { content: z.string() },
	run: ({ args }) => console.log(`content: ${args.content}`),
});

const addsCommand = definePlugin({
	meta: { name: 'adds-command' },
	capabilities: { addCommands: true },
	setup(api) {
		api.addCommand(
			'extra',
			defineCommand({ meta: { description: 'Added by a plugin' }, run() {} }),
		);
	},
});

await defineCLI({
	meta: { name: 'cli' },
	commands: { tool },
	plugins: process.env.WITH_PLUGIN ? [addsCommand] : [],
}).run();
