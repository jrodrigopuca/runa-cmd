/**
 * logs command — Showcases:
 * - Enum args (positional enum)
 * - Multiple option groups
 * - Boolean flags
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

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
		console.log(`📋 Showing last ${options.tail} lines for ${args.service} (${options.env})`);
		if (options.since) {
			console.log(`   Since: ${options.since}`);
		}
		if (options.follow) {
			console.log('   Following... (Ctrl+C to stop)');
		}
		// Simulated log lines
		console.log('');
		console.log('[2026-04-13T12:00:00Z] INFO  Server started on port 3000');
		console.log('[2026-04-13T12:00:01Z] INFO  Connected to database');
		console.log('[2026-04-13T12:00:05Z] INFO  Ready to accept connections');
	},
});
