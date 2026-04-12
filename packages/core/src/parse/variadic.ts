/**
 * @runa-cmd/core — Variadic arg validation
 *
 * Validates that z.array() positional args appear only as the last arg
 * and that at most one variadic arg exists per command.
 * These checks run at definition time (when defineCommand() is called).
 */
import type { ZodType } from 'zod';
import { RunaError } from '../errors.js';

// ─── Zod v4 internal access ────────────────────────────────

interface ZodDef {
	type: string;
	innerType?: ZodType;
	[key: string]: unknown;
}

interface ZodInternals {
	def: ZodDef;
}

function getDefType(schema: ZodType): string {
	const s = schema as unknown as { _zod: ZodInternals };
	return s._zod?.def?.type ?? 'unknown';
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Check if a Zod schema is a z.array() type.
 * Unwraps optional/default/nullable wrappers to find the base type.
 */
export function isVariadic(schema: ZodType): boolean {
	let current = schema;
	const maxDepth = 10;

	for (let i = 0; i < maxDepth; i++) {
		const defType = getDefType(current);

		if (defType === 'array') {
			return true;
		}

		// Unwrap wrappers
		if (defType === 'optional' || defType === 'default' || defType === 'nullable') {
			const s = current as unknown as { _zod: ZodInternals };
			const inner = s._zod?.def?.innerType;
			if (inner) {
				current = inner;
				continue;
			}
		}

		return false;
	}

	return false;
}

/**
 * Validate variadic arg constraints:
 * 1. z.array() is only allowed as the LAST positional arg
 * 2. At most one z.array() per command
 *
 * Throws RunaError at definition time if constraints are violated.
 */
export function validateVariadicArgs(args: Record<string, ZodType>): void {
	const keys = Object.keys(args);
	const arrayIndices: Array<{ name: string; index: number }> = [];

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!key) continue;
		const schema = args[key];
		if (schema && isVariadic(schema)) {
			arrayIndices.push({ name: key, index: i });
		}
	}

	// No arrays → valid
	if (arrayIndices.length === 0) {
		return;
	}

	// Multiple arrays → invalid
	if (arrayIndices.length > 1) {
		const names = arrayIndices.map((a) => `'${a.name}'`).join(', ');
		throw new RunaError(`Only one variadic arg is allowed per command. Found: ${names}.`, {
			code: 'INVALID_VARIADIC_ARGS',
			exitCode: 1,
		});
	}

	// Single array but not in last position → invalid
	const arrayEntry = arrayIndices[0];
	if (arrayEntry && arrayEntry.index !== keys.length - 1) {
		throw new RunaError(
			`Variadic arg '${arrayEntry.name}' must be the last positional argument. ` +
				`Found at position ${arrayEntry.index} of ${keys.length}.`,
			{ code: 'INVALID_VARIADIC_POSITION', exitCode: 1 },
		);
	}

	// Single array in last position → valid
}
