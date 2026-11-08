/**
 * A required option that can come from env names its variable when it's
 * missing (T-216): whoever runs the CLI, or operates an MCP server, learns
 * what to set. The message never shows a value.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const proxy = defineCommand({
	meta: {
		name: 'beacon',
		description: 'Start the proxy',
		options: { upstream: { env: 'OLLAMA_URL' } },
	},
	options: {
		upstream: z.string().describe('Where the model runs'),
		port: z.number().describe('Port to listen on'),
	},
	run: () => 'ok',
});

const firstLine = (stderr: string) => stderr.split('\n')[0];

describe('a missing required option', () => {
	it('names its variable when it declares one', async () => {
		const { code, stderr } = await testCLI(proxy, ['--port', '1'], { env: {} });

		expect(code).toBe(2);
		expect(firstLine(stderr)).toBe('Missing required option: --upstream, or set OLLAMA_URL');
	});

	it('stays as it was without a variable', async () => {
		const { stderr } = await testCLI(proxy, [], { env: { OLLAMA_URL: 'http://127.0.0.1:1' } });

		expect(firstLine(stderr)).toBe('Missing required option: --port');
	});

	it('shows no value, not even of other variables', async () => {
		const { stderr } = await testCLI(proxy, ['--port', '1'], {
			env: { OTHER_SECRET: 'hunter2' },
		});

		expect(stderr).not.toContain('hunter2');
	});

	it('works on global options', async () => {
		const cli = defineCLI({
			meta: { name: 'beacon', description: 'Watch a model' },
			commands: { status: defineCommand({ meta: { description: 'Status' }, run: () => 'ok' }) },
			globalOptions: { store: z.string().describe('Data folder') },
			globalMeta: { options: { store: { env: 'BEACON_STORE' } } },
		});

		const { code, stderr } = await testCLI(cli, ['status'], { env: {} });

		expect(code).toBe(2);
		expect(firstLine(stderr)).toBe('Missing required option: --store, or set BEACON_STORE');
	});
});
