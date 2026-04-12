/**
 * Unit tests for plugin system (plugin.ts)
 *
 * Tests: definePlugin, resolvePlugins, topologicalSort, capability enforcement,
 *        setup/cleanup orchestration
 * References: Spec Section 4 — all plugin scenarios
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../command.js';
import { RunaError } from '../errors.js';
import { defineMiddleware } from '../middleware.js';
import type { PluginHostRefs } from '../plugin.js';
import {
	createPluginAPI,
	definePlugin,
	resolvePlugins,
	runPluginCleanup,
	runPluginSetup,
	topologicalSort,
} from '../plugin.js';
import type { HookHandler, HookName, PluginConfig } from '../types.js';

// ─── Helpers ────────────────────────────────────────────────

function makePlugin(name: string, overrides: Partial<PluginConfig> = {}): PluginConfig {
	return {
		meta: { name, version: '1.0.0', ...overrides.meta },
		capabilities: overrides.capabilities,
		setup: overrides.setup ?? (() => {}),
		cleanup: overrides.cleanup,
	} as PluginConfig;
}

function makeRefs(overrides?: Partial<PluginHostRefs>): PluginHostRefs {
	return {
		commands: {},
		globalOptions: {},
		globalMeta: { options: {} },
		middleware: [],
		hookRegister: overrides?.hookRegister ?? (() => {}),
		getSchema:
			overrides?.getSchema ??
			(() => ({
				meta: { name: 'test' },
				commands: [],
				globalOptions: [],
			})),
	};
}

// ─── Tests ──────────────────────────────────────────────────

describe('definePlugin', () => {
	it('returns valid plugin config', () => {
		const plugin = definePlugin({
			meta: { name: 'my-plugin', version: '1.0.0' },
			capabilities: {},
			setup: () => {},
		});
		expect(plugin.meta.name).toBe('my-plugin');
	});

	it('throws if meta.name is missing', () => {
		expect(() =>
			definePlugin({
				meta: { name: '', version: '1.0.0' },
				setup: () => {},
			} as any),
		).toThrow(RunaError);
	});

	it('throws if setup is not a function', () => {
		expect(() =>
			definePlugin({
				meta: { name: 'test', version: '1.0.0' },
				setup: 'not a function',
			} as any),
		).toThrow(RunaError);
	});
});

describe('resolvePlugins', () => {
	it('resolves direct plugins', async () => {
		const plugin = makePlugin('direct');
		const result = await resolvePlugins([plugin]);
		expect(result).toEqual([plugin]);
	});

	it('resolves lazy-loaded plugins', async () => {
		const plugin = makePlugin('lazy');
		const lazyImport = async () => ({ default: plugin });
		const result = await resolvePlugins([lazyImport]);
		expect(result).toEqual([plugin]);
	});

	it('throws on failed lazy import', async () => {
		const failingImport = async () => {
			throw new Error('module not found');
		};
		await expect(resolvePlugins([failingImport as any])).rejects.toThrow(RunaError);
	});

	it('throws when lazy import has no default export', async () => {
		const noDefault = async () => ({}) as any;
		await expect(resolvePlugins([noDefault])).rejects.toThrow(RunaError);
	});
});

describe('topologicalSort', () => {
	it('sorts by dependencies (deps first)', () => {
		const a = makePlugin('pluginA');
		const b = makePlugin('pluginB', {
			meta: { name: 'pluginB', version: '1.0.0', dependencies: ['pluginA'] },
		});

		const sorted = topologicalSort([b, a]);
		expect(sorted.map((p) => p.meta.name)).toEqual(['pluginA', 'pluginB']);
	});

	it('handles plugins with no dependencies', () => {
		const a = makePlugin('a');
		const b = makePlugin('b');
		const sorted = topologicalSort([a, b]);
		expect(sorted).toHaveLength(2);
	});

	it('detects circular dependencies', () => {
		const a = makePlugin('a', {
			meta: { name: 'a', version: '1.0.0', dependencies: ['b'] },
		});
		const b = makePlugin('b', {
			meta: { name: 'b', version: '1.0.0', dependencies: ['a'] },
		});

		expect(() => topologicalSort([a, b])).toThrow(RunaError);
		try {
			topologicalSort([a, b]);
		} catch (err) {
			expect((err as RunaError).code).toBe('PLUGIN_CIRCULAR_DEPENDENCY');
		}
	});

	it('detects missing dependencies', () => {
		const a = makePlugin('a', {
			meta: { name: 'a', version: '1.0.0', dependencies: ['nonexistent'] },
		});

		expect(() => topologicalSort([a])).toThrow(RunaError);
		try {
			topologicalSort([a]);
		} catch (err) {
			expect((err as RunaError).code).toBe('PLUGIN_MISSING_DEPENDENCY');
			expect((err as RunaError).message).toContain('nonexistent');
		}
	});

	it('handles multi-level dependencies', () => {
		const c = makePlugin('c', {
			meta: { name: 'c', version: '1.0.0', dependencies: ['b'] },
		});
		const b = makePlugin('b', {
			meta: { name: 'b', version: '1.0.0', dependencies: ['a'] },
		});
		const a = makePlugin('a');

		const sorted = topologicalSort([c, b, a]);
		const names = sorted.map((p) => p.meta.name);
		expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
		expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
	});
});

describe('createPluginAPI — capability enforcement', () => {
	it('allows addCommand when capability declared', () => {
		const refs = makeRefs();
		const api = createPluginAPI('test', { addCommands: true }, refs);
		const cmd = defineCommand({
			meta: { name: 'serve', description: 'Serve' },
			run: () => {},
		});
		expect(() => api.addCommand('serve', cmd)).not.toThrow();
		expect(refs.commands['serve']).toBe(cmd);
	});

	it('throws when addCommand called without capability', () => {
		const refs = makeRefs();
		const api = createPluginAPI('test', {}, refs);
		const cmd = defineCommand({
			meta: { name: 'serve', description: 'Serve' },
			run: () => {},
		});
		expect(() => api.addCommand('serve', cmd)).toThrow(RunaError);
	});

	it('allows addGlobalOption when capability declared', () => {
		const refs = makeRefs();
		const api = createPluginAPI('test', { addGlobalOptions: true }, refs);
		expect(() => api.addGlobalOption('debug', z.boolean())).not.toThrow();
		expect(refs.globalOptions['debug']).toBeDefined();
	});

	it('throws when addGlobalOption called without capability', () => {
		const refs = makeRefs();
		const api = createPluginAPI('test', {}, refs);
		expect(() => api.addGlobalOption('debug', z.boolean())).toThrow(RunaError);
	});

	it('allows addMiddleware when capability declared', () => {
		const refs = makeRefs();
		const api = createPluginAPI('test', { addMiddleware: true }, refs);
		const mw = defineMiddleware(async ({ next }) => await next());
		expect(() => api.addMiddleware(mw)).not.toThrow();
		expect(refs.middleware).toHaveLength(1);
	});

	it('throws when addMiddleware called without capability', () => {
		const refs = makeRefs();
		const api = createPluginAPI('test', {}, refs);
		const mw = defineMiddleware(async ({ next }) => await next());
		expect(() => api.addMiddleware(mw)).toThrow(RunaError);
	});

	it('always allows hook() (no capability check)', () => {
		const hooks: Array<{ name: HookName; handler: HookHandler }> = [];
		const refs = makeRefs({
			hookRegister: (name, handler) => hooks.push({ name, handler }),
		});
		const api = createPluginAPI('test', {}, refs);
		const handler = () => {};
		expect(() => api.hook('beforeParse', handler)).not.toThrow();
		expect(hooks).toHaveLength(1);
		expect(hooks[0]!.name).toBe('beforeParse');
	});

	it('getSchema() delegates to refs', () => {
		const schema = { meta: { name: 'test' }, commands: [], globalOptions: [] };
		const refs = makeRefs({ getSchema: () => schema as any });
		const api = createPluginAPI('test', {}, refs);
		expect(api.getSchema()).toBe(schema);
	});
});

describe('runPluginSetup', () => {
	it('calls setup in order', async () => {
		const order: string[] = [];
		const a = makePlugin('a', {
			setup: () => {
				order.push('a');
			},
		});
		const b = makePlugin('b', {
			setup: () => {
				order.push('b');
			},
		});

		await runPluginSetup([a, b], makeRefs());
		expect(order).toEqual(['a', 'b']);
	});
});

describe('runPluginCleanup', () => {
	it('calls cleanup in reverse order', async () => {
		const order: string[] = [];
		const a = makePlugin('a', {
			cleanup: () => {
				order.push('a');
			},
		});
		const b = makePlugin('b', {
			cleanup: () => {
				order.push('b');
			},
		});
		const c = makePlugin('c', {
			cleanup: () => {
				order.push('c');
			},
		});

		await runPluginCleanup([a, b, c]);
		expect(order).toEqual(['c', 'b', 'a']);
	});

	it('cleanup error does not prevent other cleanups', async () => {
		const order: string[] = [];
		const a = makePlugin('a', {
			cleanup: () => {
				order.push('a');
			},
		});
		const b = makePlugin('b', {
			cleanup: () => {
				order.push('b');
				throw new Error('cleanup failed');
			},
		});
		const c = makePlugin('c', {
			cleanup: () => {
				order.push('c');
			},
		});

		const errors = await runPluginCleanup([a, b, c]);
		expect(order).toEqual(['c', 'b', 'a']);
		expect(errors).toHaveLength(1);
		expect(errors[0]!.message).toBe('cleanup failed');
	});

	it('skips plugins without cleanup', async () => {
		const order: string[] = [];
		const a = makePlugin('a', {
			cleanup: () => {
				order.push('a');
			},
		});
		const b = makePlugin('b'); // no cleanup

		const errors = await runPluginCleanup([a, b]);
		expect(order).toEqual(['a']);
		expect(errors).toHaveLength(0);
	});
});
