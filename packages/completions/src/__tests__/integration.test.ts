/**
 * Integration tests for @runa-cmd/completions
 *
 * Tests the full flow: defineCLI + completionsPlugin → getSchema → verify
 * that the completions command appears and generates valid scripts.
 */

import type { CLIConfig, CLISchema } from '@runa-cmd/core';
import { defineCommand, getSchema } from '@runa-cmd/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { generateBashCompletions } from '../generators/bash.js';
import { generateFishCompletions } from '../generators/fish.js';
import { generateZshCompletions } from '../generators/zsh.js';
import { completionsPlugin } from '../plugin.js';

// ─── Helpers ────────────────────────────────────────────────

function buildTestSchema(): CLISchema {
	const deploy = defineCommand({
		meta: {
			name: 'deploy',
			description: 'Deploy the app',
			options: {
				env: { alias: ['-e'] },
			},
		},
		args: { service: z.string().describe('Service name') },
		options: {
			env: z.enum(['staging', 'production']).describe('Target environment'),
			force: z.boolean().default(false).describe('Force deploy'),
		},
		run() {},
	});

	const configSet = defineCommand({
		meta: { name: 'set', description: 'Set a config value' },
		args: {
			key: z.string().describe('Config key'),
			value: z.string().describe('Config value'),
		},
		run() {},
	});

	const configGet = defineCommand({
		meta: { name: 'get', description: 'Get a config value' },
		args: { key: z.string().describe('Config key') },
		output: z.object({ value: z.string() }),
		async run() {
			return { value: 'test' };
		},
	});

	const cliConfig: CLIConfig = {
		meta: { name: 'my-app', version: '2.0.0', description: 'My awesome app' },
		commands: {
			deploy,
			config: {
				set: configSet,
				get: configGet,
			},
		},
		globalOptions: {
			verbose: z.boolean().default(false).describe('Enable verbose output'),
		},
	};

	return getSchema(cliConfig);
}

// ─── Tests ──────────────────────────────────────────────────

describe('integration: completionsPlugin with real CLI schema', () => {
	it('generates bash completions with all commands and options', () => {
		const schema = buildTestSchema();
		const result = generateBashCompletions(schema, schema.meta.name);

		// Commands present
		expect(result).toContain('deploy');
		expect(result).toContain('config');

		// Nested subcommands
		expect(result).toContain('set');
		expect(result).toContain('get');

		// Options
		expect(result).toContain('--env');
		expect(result).toContain('--force');
		expect(result).toContain('--no-force');

		// Enum values
		expect(result).toContain('staging');
		expect(result).toContain('production');

		// Global options
		expect(result).toContain('--verbose');

		// Complete registration
		expect(result).toContain('complete -F');
		expect(result).toContain('my-app');
	});

	it('generates zsh completions with descriptions', () => {
		const schema = buildTestSchema();
		const result = generateZshCompletions(schema, schema.meta.name);

		// Header
		expect(result).toContain('#compdef my-app');

		// Commands with descriptions
		expect(result).toContain('deploy');
		expect(result).toContain('Deploy the app');

		// Options
		expect(result).toContain('--env');
		expect(result).toContain('--force');

		// Enum inline
		expect(result).toContain('staging');
		expect(result).toContain('production');

		// Function at end
		expect(result).toContain('_my_app');
	});

	it('generates fish completions with conditions', () => {
		const schema = buildTestSchema();
		const result = generateFishCompletions(schema, schema.meta.name);

		// Disable file completions
		expect(result).toContain('complete -c my-app -f');

		// Top-level commands with subcommand condition
		expect(result).toContain('__fish_use_subcommand');
		expect(result).toContain('deploy');

		// Subcommand conditions
		expect(result).toContain('__fish_seen_subcommand_from config');

		// Options
		expect(result).toContain('-l env');
		expect(result).toContain('-l force');

		// Enum values
		expect(result).toContain('staging');
		expect(result).toContain('production');
	});

	it('plugin registers command and dispatches correctly', () => {
		const plugin = completionsPlugin();

		// Simulate plugin setup with a mock API that captures the command
		const addedCommands = new Map();
		const schema = buildTestSchema();

		const api = {
			addCommand: vi.fn((name: string, cmd: unknown) => {
				addedCommands.set(name, cmd);
			}),
			addGlobalOption: vi.fn(),
			addMiddleware: vi.fn(),
			hook: vi.fn(),
			getSchema: vi.fn(() => schema),
			getCommands: vi.fn(() => ({})),
		};

		plugin.setup(api);

		expect(addedCommands.has('completions')).toBe(true);

		// Invoke the command's run() for bash
		const cmd = addedCommands.get('completions')!;
		const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		(cmd as { run: (ctx: unknown) => void }).run({
			args: { shell: 'bash' },
			options: { instructions: false },
			globalOptions: {},
			command: { name: 'completions' },
			rawArgs: ['completions', 'bash'],
		});

		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('complete -F');
		expect(output).toContain('deploy');
		expect(output).toContain('config');

		writeSpy.mockRestore();
	});

	it('custom commandName works correctly', () => {
		const plugin = completionsPlugin({ commandName: 'complete' });
		const addedCommands = new Map();

		const api = {
			addCommand: vi.fn((name: string, cmd: unknown) => {
				addedCommands.set(name, cmd);
			}),
			addGlobalOption: vi.fn(),
			addMiddleware: vi.fn(),
			hook: vi.fn(),
			getSchema: vi.fn(() => buildTestSchema()),
			getCommands: vi.fn(() => ({})),
		};

		plugin.setup(api);

		expect(addedCommands.has('complete')).toBe(true);
		expect(addedCommands.has('completions')).toBe(false);
	});
});
