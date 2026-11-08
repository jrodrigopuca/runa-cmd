import { CommandError, defineCLI, defineCommand, defineMiddleware } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

export const deploy = defineCommand({
	meta: {
		name: 'deploy',
		description: 'Deploy a service',
		options: { token: { env: 'DEPLOY_TOKEN' } },
	},
	args: { service: z.string().describe('Service to deploy') },
	options: {
		target: z.enum(['staging', 'production']).default('staging').describe('Where to deploy'),
		replicas: z.number().int().min(1).default(1).describe('How many copies to run'),
		token: z.string().describe('API token'),
	},
	output: z.object({ url: z.string(), replicas: z.number() }),
	run({ args, options }) {
		if (options.target === 'production' && options.replicas < 2) {
			throw new CommandError('Production needs at least 2 replicas.', {
				code: 'TOO_FEW_REPLICAS',
				exitCode: 3,
			});
		}
		return {
			url: `https://${options.target}.example.com/${args.service}`,
			replicas: options.replicas,
		};
	},
	format: ({ url, replicas }) =>
		`Deployed ${url} with ${replicas} replica${replicas === 1 ? '' : 's'}`,
});

/** Writes each command that runs to stderr, as an audit log would */
export const audit = defineMiddleware(async ({ command, next }) => {
	console.error(`audit: ${command.path.join(' ')}`);
	await next();
});

export const cli = defineCLI({
	meta: { name: 'ship', version: '1.0.0', description: 'Deploy services' },
	commands: { deploy },
	middleware: [audit],
	config: { name: 'ship' },
});
