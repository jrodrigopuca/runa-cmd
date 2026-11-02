/**
 * deploy command — Showcases:
 * - Enum options with alias and env var
 * - Option groups (Deploy / Safety)
 * - Typed output schema (validated return)
 * - Descriptive positional args
 * - Deprecated options
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { bold, cyan, dim, gray, green, kv, magenta, step, successBox, yellow } from '../ui.js';

export const deploy = defineCommand({
	meta: {
		name: 'deploy',
		description: 'Deploy a service to the cloud',
		options: {
			env: { alias: ['-e'], env: 'DEPLOY_ENV', group: 'Deploy' },
			replicas: { alias: ['-r'], group: 'Deploy' },
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
		tag: z.string(),
		deployId: z.string(),
		dryRun: z.boolean(),
	}),
	run({ args, options }) {
		const deployId = `dep_${Date.now().toString(36)}`;
		const tag = options.tag ?? 'latest';

		// Progress goes to stderr: stdout is for the result, so --json stays clean
		if (!options.dryRun) {
			console.error();
			console.error(step(1, 3, 'Building image...'));
			console.error(step(2, 3, `Pushing ${gray(`${args.service}:${tag}`)} to registry...`));
			console.error(step(3, 3, `Deploying to ${options.env}...`));
		}

		return {
			url: `https://${options.env}.example.com/${args.service}`,
			service: args.service,
			environment: options.env,
			replicas: options.replicas,
			tag,
			deployId,
			dryRun: options.dryRun,
		};
	},
	format(result) {
		if (result.dryRun) {
			return [
				`\n  ${yellow('⬡')} ${bold('Dry Run')} ${dim('— no changes will be made')}\n`,
				kv('Service', bold(result.service)),
				kv('Environment', cyan(result.environment)),
				kv('Replicas', String(result.replicas)),
				kv('Tag', result.tag),
				'',
			].join('\n');
		}

		const envColors: Record<string, (s: string) => string> = {
			production: (s: string) => `\x1b[31m${s}\x1b[39m`,
			staging: yellow,
			preview: cyan,
		};
		const envColor = envColors[result.environment] ?? cyan;

		return successBox(`Deployed ${bold(result.service)} to ${envColor(result.environment)}`, [
			kv('URL', magenta(result.url)),
			kv('Replicas', green(String(result.replicas))),
			kv('Tag', result.tag),
			kv('Deploy ID', dim(result.deployId)),
		]);
	},
});
