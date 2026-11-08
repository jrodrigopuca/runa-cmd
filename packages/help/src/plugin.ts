/**
 * @runa-cmd/help — helpPlugin()
 *
 * Replaces the plain help of @runa-cmd/core. Supports 3 layers:
 * - Layer 1: Zero-config (beautiful help out of the box)
 * - Layer 2: Theme customization (custom colors)
 * - Layer 3: Custom render function (full control)
 */
import type { PluginConfig } from '@runa-cmd/core';
import { definePlugin } from '@runa-cmd/core';
import { detectColorDepth, getRenderContext } from './ansi/detect.js';
import { defaultRenderer } from './render.js';
import { resolveTheme } from './theme.js';
import type { HelpPluginOptions } from './types.js';

/**
 * Create a help plugin that renders --help with themes and layout.
 *
 * @param opts - Optional theme or custom render function
 */
export function helpPlugin(opts: HelpPluginOptions = {}): PluginConfig {
	return definePlugin({
		meta: {
			name: '@runa-cmd/help',
			description: 'Built-in help system with layout primitives and theming',
		},
		capabilities: { replaceHelp: true },
		setup(api) {
			// Removed in 0.2.0-beta.7 (ADR-0047). TypeScript rejects it; plain JS
			// would ignore it in silence, so say it once, and keep going
			if ('exitOnHelp' in opts) {
				process.stderr.write(
					'helpPlugin: exitOnHelp was removed, and does nothing. The help ends like any command: ' +
						'cleanup runs, and it exits with 0 for --help, or 2 with nothing to run. Remove the option.\n',
				);
			}

			// Core decides when help runs and what it's about, and yields if a
			// command declares --help or -h: only the rendering is left here.
			api.replaceHelp((target, output) => {
				// With nothing to run, help goes to stderr: that's the one to ask about
				const renderCtx = {
					...getRenderContext(),
					colorDepth: detectColorDepth(output as NodeJS.WriteStream),
				};
				const renderer = opts.render ?? defaultRenderer;
				const rendered = renderer({
					schema: target,
					theme: resolveTheme(opts.theme, renderCtx),
					colorDepth: renderCtx.colorDepth,
					termWidth: renderCtx.termWidth,
				});

				// Returning lets cleanup run, and core picks the exit code
				output.write(`${rendered}\n`);
			});
		},
	});
}
