/**
 * Unit tests for helpPlugin (plugin.ts)
 *
 * Tests: plugin creation, onGlobalFlags hook, --help flag triggers render+exit,
 *        subcommand detection via rawArgs, custom render fn, shortCircuit called
 */

import type { CLISchema, HookContext, HookHandler, HookName, PluginConfig } from '@runa-cmd/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRenderContext } from '../ansi/detect.js';
import { helpPlugin } from '../plugin.js';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Extract the onGlobalFlags handler from the plugin by calling setup
 * with a mock PluginAPI.
 */
function extractHandler(plugin: PluginConfig) {
	const hooks: Array<{ name: HookName; handler: HookHandler }> = [];
	const globalOptions: Record<string, unknown> = {};
	let schema: CLISchema = {
		meta: { name: 'test-cli', version: '1.0.0' },
		commands: [],
		globalOptions: [],
	};

	const mockApi = {
		addGlobalOption: (name: string, zodSchema: unknown, meta?: unknown) => {
			globalOptions[name] = { zodSchema, meta };
		},
		hook: (name: HookName, handler: HookHandler) => {
			hooks.push({ name, handler });
		},
		addCommand: vi.fn(),
		addMiddleware: vi.fn(),
		getSchema: () => schema,
	};

	plugin.setup(mockApi as any);

	const onGlobalFlags = hooks.find((h) => h.name === 'onGlobalFlags');
	return {
		handler: onGlobalFlags?.handler,
		hooks,
		globalOptions,
		setSchema: (s: CLISchema) => {
			schema = s;
		},
	};
}

function makeHookCtx(overrides: Partial<HookContext> = {}): HookContext {
	return {
		rawArgs: [],
		globalOptions: {},
		...overrides,
	} as HookContext;
}

// ─── Setup / Teardown ───────────────────────────────────────

let exitSpy: ReturnType<typeof vi.spyOn>;
let writeSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	resetRenderContext();
	exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
	exitSpy.mockRestore();
	writeSpy.mockRestore();
});

// ─── Plugin Structure ───────────────────────────────────────

describe('helpPlugin — structure', () => {
	it('returns a valid PluginConfig', () => {
		const plugin = helpPlugin();
		expect(plugin.meta.name).toBe('@runa-cmd/help');
		expect(plugin.meta.version).toBe('0.1.0');
		expect(plugin.capabilities?.addGlobalOptions).toBe(true);
		expect(typeof plugin.setup).toBe('function');
	});

	it('registers --help global option via setup', () => {
		const { globalOptions } = extractHandler(helpPlugin());
		expect(globalOptions['help']).toBeDefined();
	});

	it('registers onGlobalFlags hook', () => {
		const { hooks } = extractHandler(helpPlugin());
		const flagHooks = hooks.filter((h) => h.name === 'onGlobalFlags');
		expect(flagHooks).toHaveLength(1);
	});
});

// ─── --help Flag Triggers Render + Exit ─────────────────────

describe('helpPlugin — --help flag', () => {
	it('does nothing when help is not set', () => {
		const { handler } = extractHandler(helpPlugin());
		const ctx = makeHookCtx({ globalOptions: { help: false } });
		handler!(ctx);
		expect(exitSpy).not.toHaveBeenCalled();
		expect(writeSpy).not.toHaveBeenCalled();
	});

	it('renders help and exits when --help is true', () => {
		const { handler } = extractHandler(helpPlugin());
		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: [],
		});
		handler!(ctx);
		expect(writeSpy).toHaveBeenCalledTimes(1);
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('test-cli');
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('calls shortCircuit when available', () => {
		const { handler } = extractHandler(helpPlugin());
		const shortCircuit = vi.fn();
		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: [],
			shortCircuit,
		});
		handler!(ctx);
		expect(shortCircuit).toHaveBeenCalled();
	});
});

// ─── Subcommand Detection via rawArgs ───────────────────────

describe('helpPlugin — subcommand detection', () => {
	it('renders root help when no subcommand in rawArgs', () => {
		const { handler } = extractHandler(helpPlugin());
		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: ['--help'],
		});
		handler!(ctx);
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('test-cli');
	});

	it('renders subcommand help when subcommand matches', () => {
		const schema: CLISchema = {
			meta: { name: 'test-cli', version: '1.0.0' },
			commands: [
				{
					name: 'serve',
					description: 'Start dev server',
					fullPath: ['serve'],
					args: [],
					options: [
						{
							name: 'port',
							description: 'Port number',
							type: 'number',
							required: false,
							defaultValue: 3000,
						},
					],
					hasOutput: false,
				},
			],
			globalOptions: [],
		};

		const { handler, setSchema } = extractHandler(helpPlugin());
		setSchema(schema);

		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: ['serve', '--help'],
		});
		handler!(ctx);
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('serve');
		expect(output).toContain('Start dev server');
	});

	it('falls back to root when subcommand not found', () => {
		const { handler } = extractHandler(helpPlugin());
		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: ['nonexistent', '--help'],
		});
		handler!(ctx);
		const output = writeSpy.mock.calls[0]![0] as string;
		// Falls back to root CLI
		expect(output).toContain('test-cli');
	});
});

// ─── Custom Render Function ─────────────────────────────────

describe('helpPlugin — custom render', () => {
	it('uses custom render function when provided', () => {
		const customRender = vi.fn().mockReturnValue('CUSTOM HELP OUTPUT');
		const { handler } = extractHandler(helpPlugin({ render: customRender }));
		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: [],
		});
		handler!(ctx);
		expect(customRender).toHaveBeenCalledTimes(1);
		expect(customRender).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: expect.any(Object),
				theme: expect.any(Object),
				colorDepth: expect.any(String),
				termWidth: expect.any(Number),
			}),
		);
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('CUSTOM HELP OUTPUT');
	});
});

// ─── Custom Theme ───────────────────────────────────────────

describe('helpPlugin — custom theme', () => {
	it('passes custom theme through resolution', () => {
		const customRender = vi.fn().mockReturnValue('themed');
		const { handler } = extractHandler(
			helpPlugin({
				theme: { primary: '#00FF00' },
				render: customRender,
			}),
		);
		const ctx = makeHookCtx({
			globalOptions: { help: true },
			rawArgs: [],
		});
		handler!(ctx);
		// The custom render receives a resolved theme
		const renderCtx = customRender.mock.calls[0]![0];
		expect(renderCtx.theme).toBeDefined();
	});
});
