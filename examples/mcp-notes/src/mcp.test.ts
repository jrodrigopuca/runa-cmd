// Talks to the CLI as an agent's client does: it starts `--mcp` and speaks MCP.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'test', version: '1.0.0' });

before(async () => {
	const file = join(mkdtempSync(join(tmpdir(), 'notes-')), 'notes.json');
	const env = Object.fromEntries(
		Object.entries({ ...process.env, NOTES_FILE: file }).filter(([, value]) => value !== undefined),
	) as Record<string, string>;
	await client.connect(
		new StdioClientTransport({ command: process.execPath, args: ['src/main.ts', '--mcp'], env }),
	);
});

after(() => client.close());

test('offers every command that ends, and not watch', async () => {
	const { tools } = await client.listTools();
	assert.deepEqual(tools.map((tool) => tool.name).sort(), ['add', 'clear', 'list']);
});

test('leaves the file out of the schema: it belongs to whoever runs the server', async () => {
	const { tools } = await client.listTools();
	const add = tools.find((tool) => tool.name === 'add');
	assert.deepEqual(Object.keys(add?.inputSchema.properties ?? {}), ['text']);
});

test('tells the model why a call failed, in the text it reads', async () => {
	const result = await client.callTool({ name: 'clear', arguments: {} });
	const [first] = result.content as { type: string; text: string }[];

	assert.equal(result.isError, true);
	assert.match(first?.text ?? '', /There are no notes to delete/);
});

test('adds a note and lists it as data', async () => {
	await client.callTool({ name: 'add', arguments: { text: 'Buy milk' } });
	const result = await client.callTool({ name: 'list', arguments: {} });

	assert.deepEqual(result.structuredContent, { notes: [{ id: 1, text: 'Buy milk' }] });
});
