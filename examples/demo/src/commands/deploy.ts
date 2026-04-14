/**
 * deploy command — Showcases:
 * - Enum options with alias and env var
 * - Option groups
 * - Typed output schema
 * - Descriptive args
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

export const deploy = defineCommand({
	meta: {
		name: 'deploy',
		description: 'Deploy a service to the cloud',
		options: {
			env: { alias: ['-e'], env: 'DEPLOY_ENV', group: 'Deploy' },
			replicas: { alias: ['-r'], group: 'Deploy', hint: '1-10' },
			tag: { alias: ['-t'], group: 'Deploy' },
			dryRun: { group: 'Safety' },
			force: { alias: ['-f'], group: 'Safety', deprecated: 'Use --confirm instead' },
			confirm: { group: 'Safety' },
		},
	},
	args: {
		service: z.string().describe('Service name to deploy'),
	},
	options: {
		env: z
			.enum(['staging', 'production', 'preview'])
			.default('staging')
			.describe('Target environment'),
		replicas: z.number().default(1).describe('Number of replicas'),
		tag: z.string().optional().describe('Docker image tag'),
		dryRun: z.boolean().default(false).describe('Show what would happen without deploying'),
		force: z.boolean().default(false).describe('Skip confirmation (deprecated)'),
		confirm: z.boolean().default(false).describe('Skip confirmation prompt'),
	},
	output: z.object({
		url: z.string(),
		service: z.string(),
		environment: z.string(),
		replicas: z.number(),
		deployId: z.string(),
	}),
	run({ args, options }) {
		const deployId = `dep_${Date.now().toString(36)}`;

		if (options.dryRun) {
			console.log(`[DRY RUN] Would deploy ${args.service} to ${options.env}`);
			console.log(`  Replicas: ${options.replicas}`);
			console.log(`  Tag: ${options.tag ?? 'latest'}`);
		} else {
			console.log(`🚀 Deploying ${args.service} to ${options.env}...`);
			console.log(`   Replicas: ${options.replicas}`);
			console.log(`   Tag: ${options.tag ?? 'latest'}`);
			console.log(`   Deploy ID: ${deployId}`);
		}

		return {
			url: `https://${options.env}.example.com/${args.service}`,
			service: args.service,
			environment: options.env,
			replicas: options.replicas,
			deployId,
		};
	},
});
