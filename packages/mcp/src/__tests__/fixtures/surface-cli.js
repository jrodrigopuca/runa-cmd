// What a model sees of a small CLI. It has its own fixture so that the snapshot
// only changes when the way tools are described changes.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { mcpPlugin } from '../../../dist/index.js';

const run = () => {};

await defineCLI({
	meta: { name: 'surface', version: '1.0.0' },
	plugins: [
		mcpPlugin({
			exclude: ['internal', 'config_reset'],
			tools: {
				status: { annotations: { readOnlyHint: true } },
				deploy: {
					description: 'Deploy to production. Ask before running it.',
					annotations: { destructiveHint: true, idempotentHint: false },
				},
			},
		}),
	],
	commands: {
		status: defineCommand({
			meta: { name: 'status', description: 'Show the status' },
			output: z.object({ healthy: z.boolean() }),
			run: () => ({ healthy: true }),
		}),
		deploy: defineCommand({
			meta: {
				name: 'deploy',
				description: 'Deploy a service',
				options: { token: { env: 'SURFACE_TOKEN' } },
			},
			args: { service: z.string().describe('Service to deploy') },
			options: {
				replicas: z.number().optional().describe('How many'),
				token: z.string().optional(),
			},
			run,
		}),
		internal: defineCommand({ meta: { name: 'internal', description: 'Not for agents' }, run }),
		config: {
			get: defineCommand({
				meta: { name: 'get', description: 'Read a value' },
				args: { key: z.string() },
				run,
			}),
			reset: defineCommand({ meta: { name: 'reset', description: 'Not for agents' }, run }),
		},
	},
}).run();
