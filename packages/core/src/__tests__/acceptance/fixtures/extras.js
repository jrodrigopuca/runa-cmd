// A real CLI for what comes after `--` and for flags a person mistypes.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const show = ({ args, options, rest }) => console.log(JSON.stringify({ args, options, rest }));

await defineCLI({
	meta: { name: 'extras', version: '3.0.0' },
	commands: {
		single: defineCommand({
			meta: {
				name: 'single',
				description: 'Takes one value',
				options: { color: { valueName: 'hex' }, tint: { valueName: 'hex' } },
			},
			args: { content: z.string() },
			options: {
				style: z.string().optional(),
				color: z.string().optional().describe('A color'),
				tint: z.array(z.string()).optional(),
				mode: z.enum(['a', 'b']).optional(),
				quiet: z.boolean().optional(),
			},
			run: show,
		}),
		wrapper: defineCommand({
			meta: { name: 'wrapper', description: 'Runs another command' },
			args: { target: z.string() },
			rest: true,
			run: show,
		}),
		many: defineCommand({
			meta: { name: 'many', description: 'Takes a list' },
			args: { files: z.array(z.string()) },
			run: show,
		}),
	},
}).run();
