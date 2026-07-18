/**
 * @runa-cmd/core — Strict unknown-option checking
 *
 * Post-parse validation: util.parseArgs runs with `strict: false` (required
 * for the alias/negation handling and the two-pass global/command parse), so
 * unknown flags surface here as unexpected keys in the parse result. This is
 * the SINGLE place the check lives — disabling it is one call-site guard
 * (`CLIConfig.strictOptions: false`).
 */
import { ValidationError } from '../errors.js';
import { findSuggestion } from '../suggest.js';

// ─── Types ──────────────────────────────────────────────────

export interface AssertKnownOptionsInput {
	/** Object.keys() of the util.parseArgs result `.values` */
	producedKeys: string[];
	/**
	 * Keys parseArgs may legitimately produce: canonical names + long aliases
	 * (+ defensive `no-*` negations) from parseargs-bridge, plus global option
	 * names, long aliases, and short-alias characters added by the caller.
	 */
	knownKeys: Set<string>;
	/** Canonical names of boolean options — accepts `no-{name}` keys defensively */
	booleanKeys: Set<string>;
	/** Candidate names for did-you-mean: command + global canonical names and long aliases */
	suggestionCandidates: string[];
}

// ─── Helpers ────────────────────────────────────────────────

/** Render a parseArgs value key as the flag the user typed: `-x` or `--xyz`. */
function renderFlag(key: string): string {
	return key.length === 1 ? `-${key}` : `--${key}`;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Throw a ValidationError (exit 2) on the first parseArgs-produced key that
 * is not registered, with a did-you-mean suggestion when a candidate is
 * within Levenshtein distance ≤ 3.
 */
export function assertKnownOptions(input: AssertKnownOptionsInput): void {
	const { producedKeys, knownKeys, booleanKeys, suggestionCandidates } = input;

	for (const key of producedKeys) {
		if (knownKeys.has(key)) continue;

		// Defensive allowance: on Node 24, parseArgs folds `--no-x` into
		// `x: false` even for unregistered keys (see parseargs-negation.test.ts),
		// so `no-*` keys never appear today — this guards a future Node line
		// surfacing the negation token un-folded.
		if (key.startsWith('no-') && booleanKeys.has(key.slice(3))) continue;

		const flag = renderFlag(key);
		const suggestion = findSuggestion(key, suggestionCandidates);
		const message = suggestion
			? `Unknown option: ${flag}. Did you mean '${renderFlag(suggestion)}'?`
			: `Unknown option: ${flag}`;

		throw new ValidationError([{ code: 'custom', message, path: [] }]);
	}
}
