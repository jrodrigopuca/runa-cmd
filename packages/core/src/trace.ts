/**
 * @runa-cmd/core — What a run did, as data (ADR-0045)
 *
 * The lifecycle knows this before it becomes text. testCLI() returns it, and
 * RUNA_DEBUG=1 prints it while it happens.
 */
import type { HookName } from './types.js';

export type ValueSource = 'cli' | 'env' | 'config' | 'default' | 'input';

export type TraceEvent =
	| { step: 'config'; file?: string }
	| {
			step: 'option';
			name: string;
			scope: 'global' | 'command';
			source: ValueSource;
			/** Left out when it comes from env: it can be a secret */
			value?: unknown;
	  }
	| { step: 'hook'; name: HookName; ms: number }
	| { step: 'run'; command: string[]; ms: number }
	| { step: 'output'; stream: 'stdout' | 'stderr'; text: string };

/** One line per event. Never a value: this output ends up in CI logs. */
export function debugLine(event: TraceEvent): string | undefined {
	switch (event.step) {
		case 'config':
			return `runa: config ${event.file ?? '(no file)'}`;
		case 'option':
			return `runa: option ${event.name} (${event.source})`;
		case 'hook':
			return `runa: hook ${event.name} ${event.ms}ms`;
		case 'run':
			return `runa: run ${event.command.join(' ')} ${event.ms}ms`;
		default:
			return undefined;
	}
}

/** The events of a set of options. A value from env stays out of them. */
export function optionEvents(
	scope: 'global' | 'command',
	names: string[],
	values: Record<string, unknown>,
	sources: Record<string, ValueSource>,
): TraceEvent[] {
	return names.map((name) => {
		const source = sources[name] ?? 'default';
		const event = { step: 'option' as const, name, scope, source };
		return source === 'env' ? event : { ...event, value: values[name] };
	});
}
