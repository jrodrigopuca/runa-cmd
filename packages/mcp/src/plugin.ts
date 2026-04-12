/**
 * @runa-cmd/mcp — mcpPlugin()
 *
 * A Runa plugin that exposes CLI commands as MCP tools.
 * When `--mcp` is passed, the plugin short-circuits normal CLI execution,
 * starts an MCP server on stdio transport, and registers every CLI
 * command as an MCP tool.
 */
import type { HookContext, PluginConfig } from '@runa-cmd/core';
import { definePlugin } from '@runa-cmd/core';
import { z } from 'zod';
import { buildToolRegistrations } from './schema.js';
import { createMcpServer, registerTools, startServer } from './server.js';
import type { McpPluginOptions } from './types.js';

/**
 * Create an MCP plugin that exposes CLI commands as MCP tools.
 *
 * @param opts - Optional server name, version, or instructions override
 */
export function mcpPlugin(opts: McpPluginOptions = {}): PluginConfig {
	return definePlugin({
		meta: {
			name: '@runa-cmd/mcp',
			version: '0.1.0',
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
				const commands = api.getCommands();

				const registrations = buildToolRegistrations(commands, schema);

				const server = createMcpServer({
					name: opts.name ?? schema.meta.name,
					version: opts.version ?? schema.meta.version ?? '0.0.0',
					instructions: opts.instructions,
				});

				registerTools(server, registrations);
				await startServer(server);

				// Short-circuit — MCP server now running, don't execute CLI command
				// NOTE: Do NOT call process.exit() — server must stay alive for tool invocations
				ctx.shortCircuit?.();
			});
		},
	});
}
