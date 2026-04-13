/**
 * @runa-cmd/completions — completionsPlugin()
 *
 * A Runa plugin that adds a `completions` command for generating
 * shell completion scripts. Each shell (bash, zsh, fish) gets a
 * self-contained script derived from the CLI's schema.
 */
import type { PluginConfig } from '@runa-cmd/core';
import { defineCommand, definePlugin } from '@runa-cmd/core';
import { z } from 'zod';
import { generateBashCompletions } from './generators/bash.js';
import { generateFishCompletions } from './generators/fish.js';
import { generateZshCompletions } from './generators/zsh.js';
import { getInstallInstructions } from './install.js';
import type { CompletionsPluginOptions, Shell } from './types.js';

const generators: Record<
	Shell,
	(schema: Parameters<typeof generateBashCompletions>[0], binName: string) => string
> = {
	bash: generateBashCompletions,
	zsh: generateZshCompletions,
	fish: generateFishCompletions,
};

/**
 * Create a completions plugin that adds a `completions` command.
 *
 * Usage:
 *   mycli completions bash    → outputs bash completion script
 *   mycli completions zsh     → outputs zsh completion script
 *   mycli completions fish    → outputs fish completion script
 *
 * Add --instructions flag to get install instructions instead.
 */
export function completionsPlugin(opts: CompletionsPluginOptions = {}): PluginConfig {
	const commandName = opts.commandName ?? 'completions';

	return definePlugin({
		meta: {
			name: '@runa-cmd/completions',
			version: '0.1.0',
			description: 'Shell completion script generation',
		},
		capabilities: { addCommands: true },
		setup(api) {
			const completionsCmd = defineCommand({
				meta: {
					name: commandName,
					description: 'Generate shell completion script',
				},
				args: {
					shell: z.enum(['bash', 'zsh', 'fish']).describe('Target shell'),
				},
				options: {
					instructions: z
						.boolean()
						.optional()
						.default(false)
						.describe('Print install instructions instead of the script'),
				},
				run({ args, options }) {
					const schema = api.getSchema();
					const binName = schema.meta.name;

					if (options.instructions) {
						process.stdout.write(getInstallInstructions(args.shell, binName));
						return;
					}

					process.stdout.write(generators[args.shell](schema, binName));
				},
			});

			api.addCommand(commandName, completionsCmd);
		},
	});
}
