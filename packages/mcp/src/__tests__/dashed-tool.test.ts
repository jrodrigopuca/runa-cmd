/**
 * ADR-0043: a command keeps its name in a tool, dash included. This goes through
 * the official SDK client, not our own, because what matters is what a client
 * accepts: a name it rejected would make the tool unreachable.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'server-cli.js');

describe('a tool with a dash in its name', () => {
	const client = new Client({ name: 'runa-test', version: '1.0.0' });

	beforeAll(async () => {
		await client.connect(
			new StdioClientTransport({ command: process.execPath, args: [fixture, '--mcp'] }),
		);
	});

	afterAll(() => client.close());

	it('is listed with that name', async () => {
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.name)).toContain('dashed-name');
	});

	it('can be called, and the command gets its name', async () => {
		const result = await client.callTool({ name: 'dashed-name', arguments: { word: 'hi' } });

		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result.content)).toContain('dashed-name');
	});
});
