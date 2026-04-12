/**
 * @runa-cmd/help — helpPlugin()
 *
 * A Runa plugin that adds --help/-h as a global option and renders
 * help output when the flag is detected. Supports 3 layers:
 * - Layer 1: Zero-config (beautiful help out of the box)
 * - Layer 2: Theme customization (custom colors)
 * - Layer 3: Custom render function (full control)
 */
import type { CLISchema, CommandSchema, HookContext, PluginConfig } from '@runa-cmd/core';
import { definePlugin } from '@runa-cmd/core';
import { z } from 'zod';
import { getRenderContext } from './ansi/detect.js';
import { defaultRenderer } from './render.js';
import { resolveTheme } from './theme.js';
import type { HelpPluginOptions } from './types.js';

/**
 * Create a help plugin that intercepts --help/-h and renders help output.
 *
 * @param opts - Optional theme or custom render function
 */
export function helpPlugin(opts: HelpPluginOptions = {}): PluginConfig {
	return definePlugin({
		meta: {
			name: '@runa-cmd/help',
			version: '0.1.0',
			description: 'Built-in help system with layout primitives and theming',
		},
		capabilities: { addGlobalOptions: true },
		setup(api) {
			// Add --help, -h as a global boolean option
			api.addGlobalOption('help', z.boolean().optional().default(false).describe('Show help'), {
				alias: ['-h'],
			});

			// Intercept via onGlobalFlags hook
			api.hook('onGlobalFlags', (ctx: HookContext) => {
				if (!ctx.globalOptions?.help) return;

				const schema = api.getSchema();
				const renderCtx = getRenderContext();
				const theme = resolveTheme(opts.theme, renderCtx);

				// Detect active subcommand from rawArgs positionals
				const target = resolveTarget(schema, ctx.rawArgs);

				const renderer = opts.render ?? defaultRenderer;
				const output = renderer({
					schema: target,
					theme,
					colorDepth: renderCtx.colorDepth,
					termWidth: renderCtx.termWidth,
				});

				process.stdout.write(`${output}\n`);

				// Stop further lifecycle execution
				ctx.shortCircuit?.();
				process.exit(0);
			});
		},
	});
}

// ─── Internal Helpers ───────────────────────────────────────

/**
 * Find the target schema for help rendering.
 * Looks at rawArgs positionals to find a matching subcommand.
 * Falls back to the root CLI schema if no match.
 */
function resolveTarget(schema: CLISchema, rawArgs: string[]): CLISchema | CommandSchema {
	// Find first positional arg (not a flag)
	const subName = rawArgs.find((a) => !a.startsWith('-'));
	if (!subName) return schema;

	// Search top-level commands
	const match = schema.commands.find((cmd) => cmd.name === subName);
	return match ?? schema;
}
