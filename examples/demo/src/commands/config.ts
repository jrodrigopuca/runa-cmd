/**
 * config command group — Showcases:
 * - Nested subcommands (config get / config set / config list)
 * - Variadic args (config set key val1 val2 ...)
 * - Typed output schema
 * - JSON output option
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { bold, cyan, dim, gray, green, yellow } from '../ui.js';

// In-memory config store (simulated)
const store: Record<string, string> = {
	'deploy.env': 'staging',
	'deploy.replicas': '2',
	'deploy.region': 'us-east-1',
	'project.name': 'my-app',
	'project.org': 'acme-corp',
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
		console.log();
		if (value !== null) {
			console.log(`  ${cyan(args.key)} ${dim('=')} ${bold(value)}`);
		} else {
			console.log(`  ${yellow('⚠')} ${dim(args.key)} is not set`);
		}
		console.log();
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
		console.log();
		console.log(`  ${green('✔')} ${cyan(args.key)} ${dim('=')} ${bold(value)}`);
		console.log();
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
			console.log();
			// Group by prefix
			const groups = new Map<string, { key: string; subkey: string; value: string }[]>();
			for (const { key, value } of entries) {
				const dotIdx = key.indexOf('.');
				const prefix = dotIdx > 0 ? key.slice(0, dotIdx) : '';
				const subkey = dotIdx > 0 ? key.slice(dotIdx + 1) : key;
				if (!groups.has(prefix)) groups.set(prefix, []);
				groups.get(prefix)?.push({ key, subkey, value });
			}

			for (const [prefix, items] of groups) {
				console.log(`  ${bold(prefix)}`);
				for (const item of items) {
					console.log(`    ${gray(item.subkey)} ${dim('=')} ${item.value}`);
				}
			}
			console.log();
		}

		return { entries };
	},
});
