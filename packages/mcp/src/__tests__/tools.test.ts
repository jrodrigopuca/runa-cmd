/**
 * Tools as subprocesses of the CLI (ADR-0030), end to end: a real server, a
 * real child per call, and real JSON-RPC. No mocks.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TestClient, text } from './helpers/client.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'server-cli.js');
const clients: TestClient[] = [];

async function serve(env: Record<string, string> = {}, argv: string[] = ['--mcp']) {
	const client = new TestClient(fixture, argv, env);
	clients.push(client);
	await client.initialize();
	return client;
}

afterEach(() => {
	for (const client of clients.splice(0)) client.close();
});

describe('what the model sees', () => {
	let client: TestClient;
	let tools: Array<Record<string, any>>;

	beforeAll(async () => {
		client = new TestClient(fixture, ['--mcp']);
		await client.initialize();
		tools = await client.tools();
	});

	afterAll(() => client.close());

	const tool = (name: string) => tools.find((candidate) => candidate.name === name)!;

	it('lists every command, with nested ones joined', () => {
		expect(tools.map((candidate) => candidate.name)).toContain('config_set');
	});

	it('describes args and options as one input', () => {
		const { properties, required } = tool('deploy').inputSchema;
		expect(Object.keys(properties)).toEqual(['service', 'env', 'replicas']);
		expect(properties.service.description).toBe('Service to deploy');
		expect(properties.env.enum).toEqual(['staging', 'production']);
		expect(required).toEqual(['service']);
	});

	it('uses the input shape of a transform', () => {
		expect(tool('shout').inputSchema.properties.word.type).toBe('string');
	});

	it('declares the output schema', () => {
		expect(tool('deploy').outputSchema.required).toEqual(['url', 'profile']);
	});

	it('hides the options of the server itself', () => {
		expect(Object.keys(tool('deploy').inputSchema.properties)).not.toContain('mcp');
	});
});

describe('the result of a call', () => {
	it('returns structuredContent from what run() returned', async () => {
		const client = await serve();
		const result = await client.call('deploy', { service: 'api', env: 'production' });

		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			url: 'https://production.example.com/api',
			profile: 'default',
		});
		expect(JSON.parse(text(result))).toEqual(result.structuredContent);
	});

	it('uses stdout when the command returns nothing', async () => {
		const client = await serve();
		expect(text(await client.call('greet', { name: 'Ana' }))).toBe('Hello Ana');
	});

	it('prefers the returned value over stdout', async () => {
		const client = await serve();
		expect(text(await client.call('both'))).toBe('the answer');
	});

	it('serializes a returned object', async () => {
		const client = await serve();
		const result = await client.call('shapes', { port: 1, tags: ['a'], filter: { age: 3 } });
		expect(JSON.parse(text(result))).toEqual({ port: 1, tags: ['a'], filter: { age: 3 } });
	});

	it('reports success when a command neither prints nor returns', async () => {
		const client = await serve();
		const result = await client.call('quiet');
		expect(result.isError).toBeUndefined();
		expect(text(result)).toBe("Command 'quiet' executed successfully.");
	});

	it('reaches a nested command', async () => {
		const client = await serve();
		expect(text(await client.call('config_set', { key: 'a' }))).toBe('set a');
	});
});

describe('failures', () => {
	it('returns the error of the command', async () => {
		const client = await serve();
		const result = await client.call('fail');
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Environment is locked');
	});

	it('validates in the child, and reports what is missing', async () => {
		const client = await serve();
		const result = await client.call('deploy', {});
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Missing required argument: <service>');
	});

	it('rejects an unknown tool', async () => {
		const client = await serve();
		const result = await client.call('missing');
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Unknown tool: missing');
	});

	it('survives a command that calls process.exit', async () => {
		const client = await serve();
		expect((await client.call('crash')).isError).toBe(true);
		expect(text(await client.call('greet', { name: 'still here' }))).toBe('Hello still here');
	});

	it('does not report success when the command never finished', async () => {
		const client = await serve();
		const result = await client.call('leave');
		expect(result.isError).toBe(true);
		expect(text(result)).toContain("Command 'leave' did not finish");
	});
});

describe('the lifecycle of the CLI', () => {
	let dir: string;
	let traceFile: string;

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'runa-tools-'));
		traceFile = join(dir, 'trace');
	});

	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	const trace = () => readFileSync(traceFile, 'utf8').trim().split('\n');

	it('runs hooks and middleware on every call, and knows it is a tool', async () => {
		const client = await serve({ TRACE_FILE: traceFile });
		writeFileSync(traceFile, '');

		await client.call('greet', { name: 'Ana' });

		expect(trace()).toEqual([
			'beforeRun:tool:greet',
			'middleware:before:default',
			'middleware:after',
			'afterRun',
			'cleanup',
		]);
	});

	it('does not run cleanup before the first call', async () => {
		const client = await serve({ TRACE_FILE: traceFile });
		writeFileSync(traceFile, '');

		await client.tools();

		expect(readFileSync(traceFile, 'utf8')).toBe('');
	});

	it('lets a middleware reject the call', async () => {
		const client = await serve({ MIDDLEWARE_REJECTS: '1' });
		const result = await client.call('greet', { name: 'Ana' });
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Not allowed here');
		expect(text(result)).not.toContain('Hello');
	});

	it('does not report success when a middleware skips the command', async () => {
		const client = await serve({ MIDDLEWARE_SKIPS: '1' });
		const result = await client.call('greet', { name: 'Ana' });
		expect(result.isError).toBe(true);
		expect(text(result)).toContain("Command 'greet' did not finish");
	});

	it('forwards the globals the server started with', async () => {
		const client = await serve({}, ['--mcp', '--profile', 'prod']);
		const result = await client.call('deploy', { service: 'api' });
		expect(result.structuredContent?.profile).toBe('prod');
	});

	it('runs a server started with --mcp=true', async () => {
		const client = await serve({}, ['--mcp=true']);
		expect(text(await client.call('greet', { name: 'Ana' }))).toBe('Hello Ana');
	});
});

describe('isolation', () => {
	it('keeps stdout out of the protocol', async () => {
		const client = await serve();
		await client.call('deploy', { service: 'api' });
		await client.call('greet', { name: 'Ana' });
		expect(client.stdoutNoise).toEqual([]);
	});

	it('does not mix simultaneous calls', async () => {
		const client = await serve();
		const [a, b] = await Promise.all([
			client.call('slow', { label: 'A' }),
			client.call('slow', { label: 'B' }),
		]);
		expect(text(a as never)).toBe('start A\nend A');
		expect(text(b as never)).toBe('start B\nend B');
	});

	it('does not leak its channel to what the command starts', async () => {
		const client = await serve();
		expect(JSON.parse(text(await client.call('internals')))).toEqual([]);
	});
});

describe('values', () => {
	it('runs a transform exactly once', async () => {
		const client = await serve();
		expect(text(await client.call('shout', { word: 'hola' }))).toBe('hola!');
	});

	it.each([
		'-x',
		'--help',
		'deploy',
		'with "quotes"',
		'ñandú 🚀',
		'',
	])('passes %j intact, as data', async (word) => {
		const client = await serve();
		expect(text(await client.call('shout', { word }))).toBe(`${word}!`);
	});

	it('passes a large input', async () => {
		const client = await serve();
		const word = 'x'.repeat(2 * 1024 * 1024);
		expect(text(await client.call('shout', { word }))).toHaveLength(word.length + 1);
	});
});

describe('values the operator fixed', () => {
	const SECRET = 'sk-secret-123456';
	let dir: string;

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'runa-operated-'));
		writeFileSync(join(dir, 'server.config.json'), JSON.stringify({ bucket: 'config-bucket' }));
	});

	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	async function operatedTool(client: TestClient) {
		const tools = await client.tools();
		return tools.find((tool) => tool.name === 'operated') as Record<string, any>;
	}

	it('never shows an option that declares env, even without a value', async () => {
		const { inputSchema } = await operatedTool(await serve());
		expect(Object.keys(inputSchema.properties)).toEqual(['service', 'bucket', 'note']);
		expect(inputSchema.required).toEqual(['service']);
	});

	it('does not let the model fill a missing secret: the call fails instead', async () => {
		const client = await serve();
		const result = await client.call('operated', { service: 'api', token: 'made-up' });
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Missing required option: --token');
	});

	it('hides what env and config provide', async () => {
		const client = await serve({
			TEST_REGION: 'eu-west-1',
			TEST_TOKEN: SECRET,
			CONFIG_DIR: dir,
		});
		const { inputSchema } = await operatedTool(client);

		expect(Object.keys(inputSchema.properties)).toEqual(['service', 'note']);
		expect(inputSchema.required).toEqual(['service']);
	});

	it('fills them in the child', async () => {
		const client = await serve({ TEST_TOKEN: SECRET, CONFIG_DIR: dir });
		const result = await client.call('operated', { service: 'api' });

		expect(JSON.parse(text(result))).toMatchObject({ token: SECRET, bucket: 'config-bucket' });
	});

	it('does not let the model change them', async () => {
		const client = await serve({ TEST_REGION: 'eu-west-1', TEST_TOKEN: SECRET, CONFIG_DIR: dir });
		const result = await client.call('operated', {
			service: 'api',
			region: 'us-east-1',
			token: 'stolen',
			bucket: 'other',
		});

		expect(result.isError).toBeUndefined();
		expect(JSON.parse(text(result))).toMatchObject({
			region: 'eu-west-1',
			token: SECRET,
			bucket: 'config-bucket',
		});
	});

	it('keeps an unknown key as an error', async () => {
		const client = await serve({ TEST_TOKEN: SECRET });
		const result = await client.call('operated', { service: 'api', regoin: 'x' });
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Unknown input: regoin');
	});

	it('leaves an option in the hands of the model when told to', async () => {
		const client = await serve({
			TEST_REGION: 'eu-west-1',
			TEST_TOKEN: SECRET,
			TOOLS: JSON.stringify({ operated: { expose: ['region'] } }),
		});
		const { inputSchema } = await operatedTool(client);
		const result = await client.call('operated', { service: 'api', region: 'us-east-1' });

		expect(Object.keys(inputSchema.properties)).toContain('region');
		expect(JSON.parse(text(result)).region).toBe('us-east-1');
	});

	it('starts when a server-only option has its value', async () => {
		const client = await serve({
			TEST_TOKEN: SECRET,
			TOOLS: JSON.stringify({ operated: { serverOnly: ['token'] } }),
		});
		expect(Object.keys((await operatedTool(client)).inputSchema.properties)).not.toContain('token');
	});

	it.each([
		['a server-only option without a value', { operated: { serverOnly: ['token'] } }, '--token'],
		['an unknown tool', { missing: { expose: ['a'] } }, "'missing'"],
		['an unknown option', { operated: { expose: ['regoin'] } }, "'regoin'"],
		[
			'an option both exposed and server-only',
			{ operated: { expose: ['note'], serverOnly: ['note'] } },
			"'note'",
		],
	])('refuses to start with %s', async (_case, tools, mention) => {
		const client = new TestClient(fixture, ['--mcp'], { TOOLS: JSON.stringify(tools) });
		clients.push(client);

		expect(await client.exit()).toBe(1);
		expect(client.stderr).toContain(mention);
	});

	it('redacts a fixed value from what the command prints', async () => {
		const client = await serve({ TEST_TOKEN: SECRET });
		expect(text(await client.call('leaky'))).toBe('using [redacted]');
	});

	it('redacts a fixed value from an error', async () => {
		const client = await serve({ TEST_TOKEN: SECRET, LEAK_FAILS: '1' });
		const result = await client.call('leaky');
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('rejected [redacted]');
		expect(text(result)).not.toContain(SECRET);
	});

	it('does not touch a short value, which could be any word', async () => {
		const client = await serve({ TEST_TOKEN: 'ing' });
		expect(text(await client.call('leaky'))).toBe('using ing');
	});

	it('redacts a global the server started with', async () => {
		const client = await serve({}, ['--mcp', '--profile', 'production-eu']);
		expect(text(await client.call('whoami'))).toBe('profile [redacted]');
	});

	it('leaves what the command returns as it is', async () => {
		const client = await serve({ TEST_TOKEN: SECRET });
		const result = await client.call('operated', { service: 'api' });
		expect(JSON.parse(text(result)).token).toBe(SECRET);
	});
});

describe('starting the server', () => {
	it('refuses to start when it cannot run itself', async () => {
		const client = new TestClient(fixture, ['--mcp'], {
			SELF_COMMAND: JSON.stringify([process.execPath, '/does/not/exist.js']),
		});
		clients.push(client);

		expect(await client.exit()).toBe(1);
		expect(client.stderr).toContain('selfCommand');
	});
});
