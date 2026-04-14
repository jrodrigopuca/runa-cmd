/**
 * config command group — Showcases:
 * - Nested subcommands (config get / config set / config list)
 * - Variadic args (config set key val1 val2 ...)
 * - Simple commands with no options
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

// In-memory config store (simulated)
const store: Record<string, string> = {
	'deploy.env': 'staging',
	'deploy.replicas': '2',
	'project.name': 'my-app',
};

export const configGet = defineCommand({
	meta: { name: 'get', description: 'Get a configuration value' },
	args: {
		key: z.string().describe('Configuration key (dot-notation)'),
	},
	output: z.object({
		key: z.string(),
		value: z.string().nullable(),
	}),
	run({ args }) {
		const value = store[args.key] ?? null;
		if (value !== null) {
			console.log(`${args.key} = ${value}`);
		} else {
			console.log(`${args.key} is not set`);
		}
		return { key: args.key, value };
	},
});

export const configSet = defineCommand({
	meta: { name: 'set', description: 'Set a configuration value' },
	args: {
		key: z.string().describe('Configuration key'),
		values: z.array(z.string()).describe('Values to set (space-separated)'),
	},
	run({ args }) {
		const value = args.values.join(' ');
		store[args.key] = value;
		console.log(`Set ${args.key} = ${value}`);
	},
});

export const configList = defineCommand({
	meta: { name: 'list', description: 'List all configuration values' },
	options: {
		json: z.boolean().default(false).describe('Output as JSON'),
	},
	output: z.object({
		entries: z.array(z.object({ key: z.string(), value: z.string() })),
	}),
	run({ options }) {
		const entries = Object.entries(store).map(([key, value]) => ({ key, value }));

		if (options.json) {
			console.log(JSON.stringify(entries, null, 2));
		} else {
			for (const { key, value } of entries) {
				console.log(`${key} = ${value}`);
			}
		}

		return { entries };
	},
});
