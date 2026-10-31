/**
 * @runa-cmd/mcp — mcpPlugin()
 *
 * Exposes CLI commands as MCP tools. With `--mcp`, the CLI becomes a server
 * over stdio, and each tool call runs the CLI again as a child process, so a
 * tool is the same command a person runs (ADR-0030).
 */
import type { HookContext, PluginConfig } from '@runa-cmd/core';
import { definePlugin } from '@runa-cmd/core';
import { z } from 'zod';
import { applyOperatorValues } from './operator.js';
import { defaultSelfCommand } from './runner.js';
import { buildToolRegistrations } from './schema.js';
import type { McpPluginOptions } from './types.js';

/** What a child repeats from the server's own start: everything but `--mcp`. */
function startupArgv(): string[] {
	return process.argv.slice(2).filter((token) => token !== '--mcp' && !token.startsWith('--mcp='));
}

/**
 * Create an MCP plugin that exposes CLI commands as MCP tools.
 *
 * @param opts - Optional server name, version, instructions or selfCommand
 */
export function mcpPlugin(opts: McpPluginOptions = {}): PluginConfig {
	return definePlugin({
		meta: {
			name: '@runa-cmd/mcp',
			description: 'MCP server generation from CLI commands',
		},
		capabilities: { addGlobalOptions: true },
		setup(api) {
			// Add --mcp as a global boolean option
			api.addGlobalOption(
				'mcp',
				z.boolean().optional().default(false).describe('Start MCP server'),
			);

			// Intercept via onGlobalFlags hook
			api.hook('onGlobalFlags', async (ctx: HookContext) => {
				if (!ctx.globalOptions?.mcp) return;

				const schema = api.getSchema();
				const registrations = applyOperatorValues(
					buildToolRegistrations(api.getCommands(), schema),
					opts.tools,
					{
						configValues: await api.getConfigValues(),
						env: process.env,
						globals: ctx.globalOptions,
					},
				);

				// Loaded here so a plain CLI run doesn't pay for the MCP SDK
				const { serve } = await import('./server.js');

				await serve(registrations, {
					name: opts.name ?? schema.meta.name,
					version: opts.version ?? schema.meta.version ?? '0.0.0',
					instructions: opts.instructions,
					selfCommand: opts.selfCommand ?? defaultSelfCommand(),
					argv: startupArgv(),
				});

				// The server closed: there is no command to run
				ctx.shortCircuit?.();
			});
		},
	});
}
