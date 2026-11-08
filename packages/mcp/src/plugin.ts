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
import { applyOperatorValues, unconfiguredWarnings } from './operator.js';
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
			// Only the terminal asks for a server: a file in the current directory
			// must not turn `tool list` into something else.
			api.addGlobalOption(
				'mcp',
				z.boolean().optional().default(false).describe('Start MCP server'),
				{ configurable: false },
			);

			// Intercept via onGlobalFlags hook
			api.hook('onGlobalFlags', async (ctx: HookContext) => {
				if (!ctx.globalOptions?.mcp) return;

				const schema = api.getSchema();
				const tools = buildToolRegistrations(api.getCommands(), schema);
				const configValues = await Promise.all(
					tools.map(async (tool) => [tool.name, await api.getConfigValues(tool.path)] as const),
				);
				const registrations = applyOperatorValues(tools, opts, {
					configValues: Object.fromEntries(configValues),
					env: process.env,
					globals: ctx.globalOptions,
				});
				// stderr reaches the client's logs, and stdout is the protocol
				for (const warning of unconfiguredWarnings(registrations)) console.error(warning);

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
