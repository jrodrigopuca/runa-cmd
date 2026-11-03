import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const hello = defineCommand({
	meta: { description: 'Say hello to someone' },
	args: { name: z.string().describe('Who to greet') },
	options: { shout: z.boolean().default(false).describe('Use capital letters') },
	run: ({ args, options }) => {
		const text = `Hello, ${args.name}!`;
		return options.shout ? text.toUpperCase() : text;
	},
});

export const cli = defineCLI({
	meta: { name: 'greet', version: '1.0.0', description: 'Greet people' },
	commands: { hello },
});
