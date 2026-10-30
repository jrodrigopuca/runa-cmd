// The implicit single-command mode of defineCLI, deprecated by ADR-0023.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const tool = defineCommand({
	meta: { name: 'tool', description: 'Sample tool' },
	args: { content: z.string() },
	run: ({ args }) => console.log(`content: ${args.content}`),
});

await defineCLI({ meta: { name: 'tool' }, commands: { tool } }).run();
