// A real CLI whose option keys are camelCase, to see the flags a person types.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const paint = defineCommand({
	meta: {
		name: 'paint',
		description: 'Paint something',
		options: {
			darkColor: { alias: ['-d'] },
			oldName: { deprecated: 'Use --new-name.' },
			fromEnv: { env: 'FROM_ENV' },
		},
	},
	options: {
		darkColor: z.string().optional().describe('Dark color'),
		outputURL: z.string().optional(),
		darkMode: z.boolean().default(true),
		'already-kebab': z.string().optional(),
		oldName: z.string().optional(),
		fromEnv: z.string().optional(),
		retryCount: z.number().optional(),
		needThis: z.string().optional(),
	},
	run: ({ options, globalOptions }) => console.log(JSON.stringify({ options, globalOptions })),
});

const strict = defineCommand({
	meta: { name: 'strict', description: 'Requires an option' },
	options: { apiToken: z.string() },
	run() {},
});

const broken = process.env.BROKEN;

await defineCLI({
	meta: { name: 'names', version: '1.0.0' },
	globalOptions: {
		logLevel: z.string().default('info'),
		colorOutput: z.boolean().default(true),
		...(broken === 'global-negation' ? { noColor: z.boolean().default(false) } : {}),
	},
	config: process.env.CONFIG_DIR
		? { name: 'names', searchPaths: [process.env.CONFIG_DIR] }
		: undefined,
	commands: {
		paint,
		strict,
		...(broken === 'negation'
			? {
					build: defineCommand({
						meta: { name: 'build', description: 'Build' },
						options: { noCache: z.boolean().default(false) },
						run() {},
					}),
				}
			: {}),
		...(broken === 'hyphen-negation'
			? {
					build: defineCommand({
						meta: { name: 'build', description: 'Build' },
						options: { 'no-cache': z.boolean().optional() },
						run() {},
					}),
				}
			: {}),
		...(broken === 'same-flag'
			? {
					build: defineCommand({
						meta: { name: 'build', description: 'Build' },
						options: { darkColor: z.string(), 'dark-color': z.string() },
						run() {},
					}),
				}
			: {}),
	},
}).run();
