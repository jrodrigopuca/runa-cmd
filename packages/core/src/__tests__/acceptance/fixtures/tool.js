// A real single-command CLI, run as a child process by the acceptance tests.
// It imports the built package, the way an installed CLI would.
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const tool = defineCommand({
	meta: {
		name: 'tool',
		version: '9.9.9',
		description: 'Sample tool',
		options: { ecl: { alias: ['-e'] } },
	},
	args: { content: z.string().describe('Text to encode') },
	options: {
		ecl: z.enum(['L', 'M']).default('M').describe('Error correction level'),
		output: z.string().optional().describe('Output file'),
		size: z.number().default(10).describe('Module size'),
		darkColor: z.string().default('#000000').describe('Dark module color'),
	},
	run({ args, options, rest }) {
		console.log(JSON.stringify({ args, options, rest }));
	},
});

await runCLI(tool);
