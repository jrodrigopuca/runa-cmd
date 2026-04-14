/**
 * logs command — Showcases:
 * - Required positional arg
 * - Multiple option groups (Filter / Output)
 * - Boolean flags, number options
 * - Env var binding
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { bold, cyan, dim, gray, info, kv, yellow } from '../ui.js';

// Simulated log entries
const SAMPLE_LOGS = [
	{ ts: '2026-04-14T12:00:00Z', level: 'INFO', msg: 'Server started on port 3000' },
	{ ts: '2026-04-14T12:00:01Z', level: 'INFO', msg: 'Connected to database (pool=5)' },
	{ ts: '2026-04-14T12:00:02Z', level: 'WARN', msg: 'Slow query detected (234ms)' },
	{ ts: '2026-04-14T12:00:03Z', level: 'INFO', msg: 'Health check passed' },
	{ ts: '2026-04-14T12:00:05Z', level: 'INFO', msg: 'Ready to accept connections' },
	{ ts: '2026-04-14T12:00:10Z', level: 'INFO', msg: 'GET /api/users 200 12ms' },
	{ ts: '2026-04-14T12:00:11Z', level: 'INFO', msg: 'POST /api/deploy 201 89ms' },
	{ ts: '2026-04-14T12:00:15Z', level: 'WARN', msg: 'Memory usage at 78%' },
];

const levelColor: Record<string, (s: string) => string> = {
	INFO: cyan,
	WARN: yellow,
	ERROR: (s: string) => `\x1b[31m${s}\x1b[39m`,
};

export const logs = defineCommand({
	meta: {
		name: 'logs',
		description: 'View service logs',
		options: {
			env: { alias: ['-e'], env: 'DEPLOY_ENV', group: 'Filter' },
			follow: { alias: ['-f'], group: 'Output' },
			tail: { alias: ['-n'], group: 'Output', hint: 'lines' },
			since: { group: 'Filter', hint: '5m, 1h, 24h' },
		},
	},
	args: {
		service: z.string().describe('Service name'),
	},
	options: {
		env: z
			.enum(['staging', 'production', 'preview'])
			.default('staging')
			.describe('Target environment'),
		follow: z.boolean().default(false).describe('Follow log output in real-time'),
		tail: z.number().default(50).describe('Number of lines to show'),
		since: z.string().optional().describe('Show logs since duration'),
	},
	run({ args, options }) {
		console.log();
		console.log(
			info(
				`${bold(args.service)} ${dim('on')} ${cyan(options.env)} ${dim(`(last ${options.tail} lines)`)}`,
			),
		);

		if (options.since) {
			console.log(kv('Since', options.since));
		}
		console.log();

		// Show simulated log entries
		const entries = SAMPLE_LOGS.slice(0, Math.min(options.tail, SAMPLE_LOGS.length));
		for (const entry of entries) {
			const color = levelColor[entry.level] ?? dim;
			const ts = gray(entry.ts);
			const level = color(entry.level.padEnd(5));
			console.log(`  ${ts} ${level} ${entry.msg}`);
		}

		if (options.follow) {
			console.log();
			console.log(dim('  Watching for new logs... (Ctrl+C to stop)'));
		}
	},
});
