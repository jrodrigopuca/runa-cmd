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
import {
	bold,
	cyan,
	dim,
	gray,
	green,
	kv,
	magenta,
	step,
	successBox,
	warn,
	yellow,
} from '../ui.js';

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
		const tag = options.tag ?? 'latest';

		if (options.force) {
			console.log(warn('--force is deprecated. Use --confirm instead.'));
			console.log();
		}

		if (options.dryRun) {
			console.log(`\n  ${yellow('⬡')} ${bold('Dry Run')} ${dim('— no changes will be made')}\n`);
			console.log(kv('Service', bold(args.service)));
			console.log(kv('Environment', cyan(options.env)));
			console.log(kv('Replicas', String(options.replicas)));
			console.log(kv('Tag', tag));
			console.log();
		} else {
			const envColors: Record<string, (s: string) => string> = {
				production: (s: string) => `\x1b[31m${s}\x1b[39m`,
				staging: yellow,
				preview: cyan,
			};
			const envColor = envColors[options.env] ?? cyan;

			console.log();
			console.log(step(1, 3, 'Building image...'));
			console.log(step(2, 3, `Pushing ${gray(`${args.service}:${tag}`)} to registry...`));
			console.log(step(3, 3, `Deploying to ${envColor(options.env)}...`));

			console.log(
				successBox(`Deployed ${bold(args.service)} to ${envColor(options.env)}`, [
					kv('URL', magenta(`https://${options.env}.example.com/${args.service}`)),
					kv('Replicas', green(String(options.replicas))),
					kv('Tag', tag),
					kv('Deploy ID', dim(deployId)),
				]),
			);
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
