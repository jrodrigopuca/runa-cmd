import { writeFileSync } from 'node:fs';
import { CommandError, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { renderBadge } from './badge.ts';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const badge = defineCommand({
	meta: {
		name: 'badge',
		version: '1.0.0',
		description: 'Make an SVG badge',
		options: {
			output: { alias: ['-o'], valueName: 'file' },
			style: { alias: ['-s'] },
			textColor: { valueName: 'hex' },
		},
	},
	args: {
		label: z.string().describe('Text on the badge'),
	},
	options: {
		output: z.string().optional().describe('Write to a file instead of stdout'),
		style: z.enum(['flat', 'round']).default('flat').describe('Badge style'),
		textColor: z
			.string()
			.regex(HEX_COLOR, '--text-color must be a hex color, such as #ffffff')
			.default('#ffffff')
			.describe('Text color'),
		uppercase: z.boolean().default(false).describe('Use capital letters'),
	},
	run({ args, options }) {
		const svg = renderBadge(args.label, options);
		if (!options.output) return svg;

		try {
			writeFileSync(options.output, svg);
		} catch (error) {
			throw new CommandError(`Cannot write ${options.output}: ${(error as Error).message}`);
		}
		return `Saved to ${options.output}`;
	},
});
