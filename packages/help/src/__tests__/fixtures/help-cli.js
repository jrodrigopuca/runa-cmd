// A real CLI with the help plugin, to see what reaches a pipe.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { helpPlugin } from '../../../dist/index.js';

const add = defineCommand({
	meta: {
		description: 'Add a note',
		options: { priority: { env: 'NOTES_PRIORITY', deprecated: 'Use --level' } },
	},
	args: { title: z.string().describe('The title'), tags: z.array(z.string()).optional() },
	options: {
		priority: z.string().default('low').describe('How urgent'),
		level: z.string().describe('A required level'),
	},
	run() {},
});

await defineCLI({
	meta: { name: 'notes', version: '1.0.0', description: 'Keep notes' },
	commands: { add, tag: { add } },
	plugins: [helpPlugin()],
}).run();
