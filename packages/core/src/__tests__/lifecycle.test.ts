/**
 * Unit tests for lifecycle engine (lifecycle.ts)
 *
 * Tests: hook registration, execution order, short-circuit, cleanup guarantees
 * References: Spec Section 5 — all lifecycle scenarios
 */
import { describe, expect, it } from 'vitest';
import { createHookRegistry } from '../lifecycle.js';
import type { HookContext } from '../types.js';

function makeCtx(overrides?: Partial<HookContext>): HookContext {
	return {
		cli: { name: 'test' },
		rawArgs: [],
		...overrides,
	};
}

describe('createHookRegistry', () => {
	it('registers and emits hooks in order', async () => {
		const registry = createHookRegistry();
		const order: number[] = [];

		registry.register('beforeParse', () => {
			order.push(1);
		});
		registry.register('beforeParse', () => {
			order.push(2);
		});
		registry.register('beforeParse', () => {
			order.push(3);
		});

		await registry.emit('beforeParse', makeCtx());
		expect(order).toEqual([1, 2, 3]);
	});

	it('emits to correct hook name only', async () => {
		const registry = createHookRegistry();
		const order: string[] = [];

		registry.register('beforeParse', () => {
			order.push('beforeParse');
		});
		registry.register('afterParse', () => {
			order.push('afterParse');
		});

		await registry.emit('beforeParse', makeCtx());
		expect(order).toEqual(['beforeParse']);
	});

	it('returns empty handlers for unregistered hook', () => {
		const registry = createHookRegistry();
		expect(registry.getHandlers('beforeParse')).toEqual([]);
	});

	it('getHandlers returns registered handlers', () => {
		const registry = createHookRegistry();
		const handler = () => {};
		registry.register('beforeRun', handler);
		expect(registry.getHandlers('beforeRun')).toEqual([handler]);
	});
});

describe('onGlobalFlags short-circuit', () => {
	it('supports short-circuit via context.shortCircuit()', async () => {
		const registry = createHookRegistry();
		const order: string[] = [];

		registry.register('onGlobalFlags', (ctx) => {
			order.push('first');
			ctx.shortCircuit?.();
		});
		registry.register('onGlobalFlags', () => {
			order.push('second');
		});

		const result = await registry.emit('onGlobalFlags', makeCtx());
		expect(result.shortCircuited).toBe(true);
		expect(order).toEqual(['first']);
		expect(order).not.toContain('second');
	});

	it('does not short-circuit when shortCircuit() is not called', async () => {
		const registry = createHookRegistry();
		const order: string[] = [];

		registry.register('onGlobalFlags', () => {
			order.push('first');
		});
		registry.register('onGlobalFlags', () => {
			order.push('second');
		});

		const result = await registry.emit('onGlobalFlags', makeCtx());
		expect(result.shortCircuited).toBe(false);
		expect(order).toEqual(['first', 'second']);
	});
});

describe('onError handling', () => {
	it('receives error in context', async () => {
		const registry = createHookRegistry();
		let receivedError: Error | undefined;

		registry.register('onError', (ctx) => {
			receivedError = ctx.error;
		});

		const error = new Error('test error');
		await registry.emit('onError', makeCtx({ error }));
		expect(receivedError).toBe(error);
	});

	it('allows setting context.handled', async () => {
		const registry = createHookRegistry();

		registry.register('onError', (ctx) => {
			ctx.handled = true;
		});

		const ctx = makeCtx({ error: new Error('test') });
		await registry.emit('onError', ctx);
		expect(ctx.handled).toBe(true);
	});
});

describe('cleanup hook', () => {
	it('always runs all handlers even if one throws', async () => {
		const registry = createHookRegistry();
		const order: string[] = [];

		registry.register('cleanup', () => {
			order.push('first');
		});
		registry.register('cleanup', () => {
			order.push('second');
			throw new Error('cleanup failed');
		});
		registry.register('cleanup', () => {
			order.push('third');
		});

		// Should NOT throw
		await registry.emit('cleanup', makeCtx());
		expect(order).toEqual(['first', 'second', 'third']);
	});
});

describe('async hooks', () => {
	it('supports async handlers', async () => {
		const registry = createHookRegistry();
		const order: number[] = [];

		registry.register('afterRun', async () => {
			await new Promise<void>((r) => setTimeout(r, 10));
			order.push(1);
		});
		registry.register('afterRun', async () => {
			order.push(2);
		});

		await registry.emit('afterRun', makeCtx());
		expect(order).toEqual([1, 2]);
	});
});

describe('standard hooks propagate errors', () => {
	it('throws when a standard hook handler throws', async () => {
		const registry = createHookRegistry();

		registry.register('beforeRun', () => {
			throw new Error('abort');
		});

		await expect(registry.emit('beforeRun', makeCtx())).rejects.toThrow('abort');
	});
});
