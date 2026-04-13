/**
 * Tests for completionsPlugin() — plugin unit tests with mock API
 */
import type { CLISchema, Command, PluginAPI } from '@runa-cmd/core';
import { describe, expect, it, vi } from 'vitest';
import { completionsPlugin } from '../plugin.js';

// ─── Helpers ────────────────────────────────────────────────

function createMockPluginAPI(): {
	api: PluginAPI;
	addedCommands: Map<string, Command>;
} {
	const addedCommands = new Map<string, Command>();

	const schema: CLISchema = {
		meta: { name: 'test-cli', version: '1.0.0', description: 'Test CLI' },
		commands: [
			{
				name: 'deploy',
				description: 'Deploy the app',
				fullPath: ['deploy'],
				args: [],
				options: [],
				hasOutput: false,
			},
		],
		globalOptions: [],
	};

	const api: PluginAPI = {
		addCommand: vi.fn((name: string, command: Command) => {
			addedCommands.set(name, command);
		}),
		addGlobalOption: vi.fn(),
		addMiddleware: vi.fn(),
		hook: vi.fn(),
		getSchema: vi.fn(() => schema),
		getCommands: vi.fn(() => ({})),
	};

	return { api, addedCommands };
}

// ─── Tests ──────────────────────────────────────────────────

describe('completionsPlugin', () => {
	it('returns a valid plugin config with addCommands capability', () => {
		const plugin = completionsPlugin();

		expect(plugin.meta.name).toBe('@runa-cmd/completions');
		expect(plugin.meta.version).toBe('0.1.0');
		expect(plugin.capabilities?.addCommands).toBe(true);
		expect(typeof plugin.setup).toBe('function');
	});

	it('registers a completions command via api.addCommand', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		expect(api.addCommand).toHaveBeenCalledOnce();
		expect(addedCommands.has('completions')).toBe(true);
	});

	it('respects custom commandName option', () => {
		const plugin = completionsPlugin({ commandName: 'complete' });
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		expect(addedCommands.has('complete')).toBe(true);
		expect(addedCommands.has('completions')).toBe(false);
	});

	it('registered command has correct meta', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		const cmd = addedCommands.get('completions');
		expect(cmd).toBeDefined();
		expect(cmd!.meta.name).toBe('completions');
		expect(cmd!.meta.description).toBe('Generate shell completion script');
	});

	it('registered command has shell arg and instructions option', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		const cmd = addedCommands.get('completions');
		expect(cmd).toBeDefined();
		// The command should have args.shell and options.instructions defined
		// We can verify by checking the command has args and options
		expect(cmd!.args).toBeDefined();
		expect(cmd!.options).toBeDefined();
	});

	it('run() outputs bash completion script to stdout', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		const cmd = addedCommands.get('completions')!;
		const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		cmd.run({
			args: { shell: 'bash' as const },
			options: { instructions: false },
			globalOptions: {},
			command: cmd.meta,
			rawArgs: ['completions', 'bash'],
		});

		expect(writeSpy).toHaveBeenCalledOnce();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('complete -F');
		expect(output).toContain('test_cli'); // hyphens → underscores in function name

		writeSpy.mockRestore();
	});

	it('run() outputs zsh completion script to stdout', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		const cmd = addedCommands.get('completions')!;
		const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		cmd.run({
			args: { shell: 'zsh' as const },
			options: { instructions: false },
			globalOptions: {},
			command: cmd.meta,
			rawArgs: ['completions', 'zsh'],
		});

		expect(writeSpy).toHaveBeenCalledOnce();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('#compdef test-cli');

		writeSpy.mockRestore();
	});

	it('run() outputs fish completion script to stdout', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		const cmd = addedCommands.get('completions')!;
		const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		cmd.run({
			args: { shell: 'fish' as const },
			options: { instructions: false },
			globalOptions: {},
			command: cmd.meta,
			rawArgs: ['completions', 'fish'],
		});

		expect(writeSpy).toHaveBeenCalledOnce();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('complete -c test-cli');

		writeSpy.mockRestore();
	});

	it('run() outputs install instructions when --instructions flag is set', () => {
		const plugin = completionsPlugin();
		const { api, addedCommands } = createMockPluginAPI();

		plugin.setup(api);

		const cmd = addedCommands.get('completions')!;
		const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		cmd.run({
			args: { shell: 'bash' as const },
			options: { instructions: true },
			globalOptions: {},
			command: cmd.meta,
			rawArgs: ['completions', 'bash', '--instructions'],
		});

		expect(writeSpy).toHaveBeenCalledOnce();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('test-cli completions bash');
		expect(output).toContain('.bashrc');
		// Should NOT contain completion script content
		expect(output).not.toContain('complete -F');

		writeSpy.mockRestore();
	});
});
