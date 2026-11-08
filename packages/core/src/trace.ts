/**
 * @runa-cmd/core — What a run did, as data (ADR-0045)
 *
 * The lifecycle knows this before it becomes text. testCLI() returns it, and
 * RUNA_DEBUG=1 prints it while it happens.
 */
import type { HookName } from './types.js';

/**
 * Where a value came from: the terminal, env, the config file, its default, or
 * the input of a tool call through MCP.
 */
export type ValueSource = 'cli' | 'env' | 'config' | 'default' | 'input';

/**
 * One thing a run did: the config file it read, where an option came from, a
 * hook and how long it took, the command, or something written. Its shape isn't
 * part of the versioning contract.
 */
export type TraceEvent =
	| {
			/** The config file was looked for */
			step: 'config';
			/** The file it read, if it found one */
			file?: string;
	  }
	| {
			/** An option got its value */
			step: 'option';
			/** Its key */
			name: string;
			/** Whether it's a global option or the command's own */
			scope: 'global' | 'command';
			/** Where the value came from */
			source: ValueSource;
			/** Left out when it comes from env: it can be a secret */
			value?: unknown;
	  }
	| {
			/** A hook ran, if it had handlers */
			step: 'hook';
			/** Which one */
			name: HookName;
			/** How long its handlers took */
			ms: number;
	  }
	| {
			/** The command ran */
			step: 'run';
			/** Its whole path */
			command: string[];
			/** How long it took, with its middleware */
			ms: number;
	  }
	| {
			/** Something was written */
			step: 'output';
			/** Where */
			stream: 'stdout' | 'stderr';
			/** What */
			text: string;
	  };

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
