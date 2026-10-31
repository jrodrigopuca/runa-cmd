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
import { getRenderContext } from './ansi/detect.js';
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
			// Core decides when help runs and what it's about, and yields if a
			// command declares --help or -h: only the rendering is left here.
			api.replaceHelp((target, output) => {
				const renderCtx = getRenderContext();
				const renderer = opts.render ?? defaultRenderer;
				const rendered = renderer({
					schema: target,
					theme: resolveTheme(opts.theme, renderCtx),
					colorDepth: renderCtx.colorDepth,
					termWidth: renderCtx.termWidth,
				});

				output.write(`${rendered}\n`);

				// Returning lets cleanup run, and core picks the exit code. Exiting
				// here is the opt-in v0.1.0 behavior.
				if (opts.exitOnHelp) process.exit(0);
			});
		},
	});
}
