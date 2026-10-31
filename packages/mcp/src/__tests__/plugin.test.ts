/**
 * Tests for mcpPlugin() — plugin integration with mock API
 */
import type {
	CLISchema,
	CommandTree,
	HookContext,
	HookHandler,
	HookName,
	OptionMeta,
	PluginAPI,
} from '@runa-cmd/core';
import { describe, expect, it, vi } from 'vitest';
import { mcpPlugin } from '../plugin.js';

// ─── Helpers ────────────────────────────────────────────────

function createMockPluginAPI(commands: CommandTree = {}): {
	api: PluginAPI;
	hooks: Map<HookName, HookHandler[]>;
	globalOptions: Map<string, { schema: unknown; meta?: OptionMeta }>;
} {
	const hooks = new Map<HookName, HookHandler[]>();
	const globalOptions = new Map<string, { schema: unknown; meta?: OptionMeta }>();

	const schema: CLISchema = {
		meta: { name: 'test-cli', version: '1.0.0', description: 'Test' },
		commands: [],
		globalOptions: [],
	};

	const api: PluginAPI = {
		addCommand: vi.fn(),
		addGlobalOption: vi.fn((name: string, s: unknown, meta?: OptionMeta) => {
			globalOptions.set(name, { schema: s, meta });
		}),
		addMiddleware: vi.fn(),
		hook: vi.fn((name: HookName, handler: HookHandler) => {
			if (!hooks.has(name)) hooks.set(name, []);
			hooks.get(name)?.push(handler);
		}),
		getSchema: vi.fn(() => schema),
		getCommands: vi.fn(() => commands),
	};

	return { api, hooks, globalOptions };
}

// ─── Tests ──────────────────────────────────────────────────

describe('mcpPlugin', () => {
	it('returns a valid plugin config', () => {
		const plugin = mcpPlugin();

		expect(plugin.meta.name).toBe('@runa-cmd/mcp');
		expect(plugin.capabilities?.addGlobalOptions).toBe(true);
		expect(typeof plugin.setup).toBe('function');
	});

	it('adds --mcp as a global boolean option', () => {
		const plugin = mcpPlugin();
		const { api, globalOptions } = createMockPluginAPI();

		plugin.setup(api);

		expect(globalOptions.has('mcp')).toBe(true);
	});

	it('registers an onGlobalFlags hook', () => {
		const plugin = mcpPlugin();
		const { api, hooks } = createMockPluginAPI();

		plugin.setup(api);

		expect(hooks.has('onGlobalFlags')).toBe(true);
		expect(hooks.get('onGlobalFlags')).toHaveLength(1);
	});

	it('does nothing when --mcp is not set', async () => {
		const plugin = mcpPlugin();
		const { api, hooks } = createMockPluginAPI();

		plugin.setup(api);

		const handler = hooks.get('onGlobalFlags')?.[0];
		expect(handler).toBeDefined();

		const shortCircuit = vi.fn();
		const ctx: HookContext = {
			cli: { name: 'test-cli' },
			rawArgs: ['deploy'],
			globalOptions: { mcp: false },
			shortCircuit,
		};

		await handler!(ctx);

		// Should NOT short-circuit
		expect(shortCircuit).not.toHaveBeenCalled();
	});

	it('does nothing when globalOptions is undefined', async () => {
		const plugin = mcpPlugin();
		const { api, hooks } = createMockPluginAPI();

		plugin.setup(api);

		const handler = hooks.get('onGlobalFlags')?.[0];
		const shortCircuit = vi.fn();
		const ctx: HookContext = {
			cli: { name: 'test-cli' },
			rawArgs: [],
			shortCircuit,
		};

		await handler!(ctx);

		expect(shortCircuit).not.toHaveBeenCalled();
	});

	it('accepts custom options (name, version, instructions)', () => {
		const plugin = mcpPlugin({
			name: 'custom-server',
			version: '2.0.0',
			instructions: 'Use deploy to deploy things',
		});

		// Plugin should still be valid
		expect(plugin.meta.name).toBe('@runa-cmd/mcp');
	});
});
