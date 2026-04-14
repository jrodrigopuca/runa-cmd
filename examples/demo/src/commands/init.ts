/**
 * init command — Showcases:
 * - Simple positional arg with default
 * - Minimal command definition
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { bold, dim, green, step, successBox } from '../ui.js';

export const init = defineCommand({
	meta: { name: 'init', description: 'Initialize a new project' },
	args: {
		name: z.string().default('.').describe('Project directory'),
	},
	run({ args }) {
		const dir = args.name === '.' ? 'current directory' : args.name;

		console.log();
		console.log(step(1, 3, `Creating project in ${bold(dir)}...`));
		console.log(step(2, 3, 'Writing config files...'));
		console.log(step(3, 3, 'Setting up directory structure...'));

		console.log(
			successBox('Project initialized', [
				`  ${green('+')} runa.config.json`,
				`  ${green('+')} src/`,
				`  ${green('+')} src/commands/`,
				'',
				`  Run ${dim('runa-demo deploy <service>')} to get started.`,
			]),
		);
	},
});
