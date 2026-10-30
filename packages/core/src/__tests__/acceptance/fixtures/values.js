// A real CLI that prints the boolean values it resolved from each source.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const show = defineCommand({
	meta: {
		name: 'show',
		description: 'Print resolved values',
		options: {
			minify: { env: 'MINIFY' },
			cache: { env: 'CACHE' },
			watch: { env: 'WATCH' },
		},
	},
	options: {
		minify: z.boolean().default(false),
		cache: z.boolean().default(true),
		watch: z.boolean().optional(),
	},
	run({ options }) {
		console.log(JSON.stringify(options));
	},
});

const noop = defineCommand({ meta: { name: 'noop', description: 'noop' }, run() {} });

await defineCLI({
	meta: { name: 'values' },
	commands: { show, noop },
	config: process.env.CONFIG_DIR
		? { name: 'values', searchPaths: [process.env.CONFIG_DIR] }
		: undefined,
}).run();
