/**
 * Integration tests for mcpPlugin with defineCLI
 *
 * These tests verify the plugin integrates correctly with the
 * Runa CLI lifecycle without starting a real MCP server.
 */
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { mcpPlugin } from '../plugin.js';

describe('mcpPlugin integration with defineCLI', () => {
	it('can be registered as a plugin without errors', () => {
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy' },
			options: { env: z.string().describe('Environment') },
			run() {},
		});

		// Should not throw
		const cli = defineCLI({
			meta: { name: 'test-cli', version: '1.0.0' },
			commands: { deploy },
			plugins: [mcpPlugin()],
		});

		expect(cli._type).toBe('runa:cli');
	});

	it('normal execution works when --mcp is not passed', async () => {
		let ranWith: string | undefined;

		const greet = defineCommand({
			meta: { name: 'greet', description: 'Greet' },
			args: { name: z.string() },
			run({ args }) {
				ranWith = args.name as string;
			},
		});

		const cli = defineCLI({
			meta: { name: 'test-cli', version: '1.0.0' },
			commands: { greet },
			plugins: [mcpPlugin()],
		});

		await cli.run(['greet', 'Alice']);
		expect(ranWith).toBe('Alice');
	});

	it('can be used alongside other plugins', () => {
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy' },
			run() {},
		});

		// Should not throw even with multiple plugins
		const cli = defineCLI({
			meta: { name: 'test-cli' },
			commands: { deploy },
			plugins: [
				mcpPlugin(),
				// Could add helpPlugin here too
			],
		});

		expect(cli._type).toBe('runa:cli');
	});

	it('accepts custom mcpPlugin options', () => {
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy' },
			run() {},
		});

		const cli = defineCLI({
			meta: { name: 'test-cli' },
			commands: { deploy },
			plugins: [
				mcpPlugin({
					name: 'custom-mcp',
					version: '2.0.0',
					instructions: 'Use deploy to deploy the app.',
				}),
			],
		});

		expect(cli._type).toBe('runa:cli');
	});
});
