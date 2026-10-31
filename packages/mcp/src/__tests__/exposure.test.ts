/**
 * What an author exposes to an agent, and how it is described, through a real
 * server. The snapshot is the contract with the model: if it changes, what
 * every model reads changed.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { TestClient, text } from './helpers/client.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const serverCli = join(fixtures, 'server-cli.js');
const surfaceCli = join(fixtures, 'surface-cli.js');

let clients: TestClient[] = [];

afterEach(() => {
	for (const client of clients) client.close();
	clients = [];
});

function start(fixture: string, env: Record<string, string> = {}) {
	const client = new TestClient(fixture, ['--mcp'], env);
	clients.push(client);
	return client;
}

async function serve(fixture: string, env: Record<string, string> = {}) {
	const client = start(fixture, env);
	await client.initialize();
	return client;
}

const json = (value: unknown) => JSON.stringify(value);

async function refusal(env: Record<string, string>) {
	const client = start(serverCli, env);
	expect(await client.exit()).not.toBe(0);
	return client.stderr;
}

describe('what a model sees', () => {
	it('stays the same unless it changes on purpose', async () => {
		const client = await serve(surfaceCli);
		expect(await client.tools()).toMatchSnapshot();
	});
});

describe('exclude', () => {
	const env = { EXCLUDE: json(['deploy', 'config_set']) };

	it('removes the tool from the list', async () => {
		const client = await serve(serverCli, env);
		const names = (await client.tools()).map((tool) => tool.name);

		expect(names).not.toContain('deploy');
		expect(names).not.toContain('config_set');
		expect(names).toContain('greet');
	});

	it('leaves no way to call it', async () => {
		const client = await serve(serverCli, env);
		const result = await client.call('deploy', { service: 'api' });

		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Unknown tool: deploy');
	});

	it('fails at startup on a name that does not exist', async () => {
		expect(await refusal({ EXCLUDE: json(['deplo']) })).toContain("no tool named 'deplo'");
	});

	it('fails at startup if an excluded tool has settings', async () => {
		const stderr = await refusal({
			EXCLUDE: json(['deploy']),
			TOOLS: json({ deploy: { description: 'Deploy' } }),
		});
		expect(stderr).toContain("tool 'deploy' is excluded");
	});
});

describe('annotations and descriptions', () => {
	const toolNamed = async (client: TestClient, name: string) =>
		(await client.tools()).find((tool) => tool.name === name);

	it('passes annotations as the specification defines them', async () => {
		const annotations = { readOnlyHint: true, openWorldHint: false, title: 'Who am I' };
		const client = await serve(serverCli, { TOOLS: json({ whoami: { annotations } }) });
		expect((await toolNamed(client, 'whoami'))?.annotations).toEqual(annotations);
	});

	it('says nothing for a tool without them, so clients assume the worst', async () => {
		const client = await serve(serverCli);
		expect(await toolNamed(client, 'whoami')).not.toHaveProperty('annotations');
	});

	it('fails at startup on a tool marked read-only and destructive', async () => {
		const annotations = { readOnlyHint: true, destructiveHint: true };
		const stderr = await refusal({ TOOLS: json({ whoami: { annotations } }) });
		expect(stderr).toContain("tool 'whoami'");
		expect(stderr).toContain('read-only');
	});

	it('uses the description of the tool instead of the one of the command', async () => {
		const client = await serve(serverCli, {
			TOOLS: json({ whoami: { description: 'Who the agent acts as' } }),
		});
		expect((await toolNamed(client, 'whoami'))?.description).toBe('Who the agent acts as');
	});
});
