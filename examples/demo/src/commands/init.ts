/**
 * init command — Showcases:
 * - Simple positional arg with default
 * - Minimal command definition
 */
import { defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

export const init = defineCommand({
	meta: { name: 'init', description: 'Initialize a new project' },
	args: {
		name: z.string().default('.').describe('Project directory'),
	},
	run({ args }) {
		console.log(
			`Initializing project in ${args.name === '.' ? 'current directory' : args.name}...`,
		);
		console.log('  Created runa.config.json');
		console.log('  Created src/');
		console.log('  Done! Run `runa deploy` to get started.');
	},
});
