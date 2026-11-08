import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { helpPlugin } from '@runa-cmd/help';
import { renderHelp } from './render.ts';

const deploy = defineCommand({
	meta: { description: 'Deploy a service' },
	options: { env: z.enum(['staging', 'production']).default('staging').describe('Where') },
	run: ({ options }) => `Deployed to ${options.env}`,
});

const status = defineCommand({
	meta: { description: 'Show what is running' },
	run: () => 'All good',
});

export const cli = defineCLI({
	meta: { name: 'tool', version: '1.0.0', description: 'Deploy and check services' },
	commands: { deploy, status },
	plugins: [helpPlugin({ render: renderHelp })],
});
