/**
 * @runa-cmd/core — Strict unknown-option checking
 *
 * Post-parse validation: util.parseArgs runs with `strict: false` (required
 * for the alias/negation handling and the two-pass global/command parse), so
 * unknown flags surface here as unexpected keys in the parse result. This is
 * the SINGLE place the check lives — disabling it is one call-site guard
 * (`CLIConfig.strictOptions: false`).
 */
import type { ParseArgsConfig } from 'node:util';
import { ValidationError } from '../errors.js';
import { flagName, longFlag } from '../flag-name.js';
import { findSuggestion } from '../suggest.js';
import type { OptionMeta } from '../types.js';

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
	/** What was typed: parseArgs reports `--no-x` under the key `x` */
	tokens?: OptionToken[];
}

// ─── Helpers ────────────────────────────────────────────────

/** Render a parseArgs value key as the flag the user typed: `-x` or `--xyz`. */
function renderFlag(key: string): string {
	return key.length === 1 ? `-${key}` : `--${key}`;
}

function suggestFlag(key: string, candidates: string[]): string | undefined {
	// `--darkColor` isn't a typo: it's the right name in the wrong form.
	if (candidates.includes(flagName(key))) return flagName(key);

	// One letter says too little for a distance, but `-V` has an obvious owner.
	if (key.length === 1) {
		const owners = candidates.filter((name) => name.startsWith(key.toLowerCase()));
		return owners.length === 1 ? owners[0] : undefined;
	}
	return findSuggestion(key, candidates);
}

// ─── Public API ─────────────────────────────────────────────

/** The option tokens of a `parseArgs({ tokens: true })` result. */
export interface OptionToken {
	kind: string;
	name?: string;
	rawName?: string;
	value?: string;
	inlineValue?: boolean;
}

export interface AssertOptionValuesInput {
	tokens: OptionToken[] | undefined;
	/** Options registered in the parseArgs config */
	options: NonNullable<ParseArgsConfig['options']>;
	longAliasMap: Record<string, string>;
	optionMeta?: Record<string, OptionMeta>;
}

/** Every token that would be read as one of these options. */
function registeredFlags(options: AssertOptionValuesInput['options']): Set<string> {
	const flags = new Set<string>();
	for (const [name, option] of Object.entries(options)) {
		flags.add(`--${name}`);
		if (option.type === 'boolean') flags.add(`--no-${name}`);
		if (option.short) flags.add(`-${option.short}`);
	}
	return flags;
}

/**
 * Throw a ValidationError (exit 2) on the first option that takes a value but
 * got none. Tokens tell the cases apart: with `--tag --force`, parseArgs takes
 * `--force` as the value and silently drops the flag, while `--tag=--force`
 * and `--tag -text` are values the user meant.
 */
export function assertOptionValues(input: AssertOptionValuesInput): void {
	const { tokens = [], options, longAliasMap, optionMeta } = input;
	const flags = registeredFlags(options);

	for (const { kind, name: key = '', rawName, value, inlineValue } of tokens) {
		if (kind !== 'option' || options[key]?.type !== 'string') continue;

		const name = longAliasMap[key] ?? key;
		if (rawName === `--no-${key}`) {
			const message = `Option ${longFlag(name)} can't be negated: it takes a value`;
			throw new ValidationError([{ code: 'custom', message, path: [] }]);
		}

		if (value !== undefined && (inlineValue || !flags.has(value))) continue;

		const names = [...(optionMeta?.[name]?.alias ?? []), longFlag(name)].join(', ');
		throw new ValidationError([
			{ code: 'custom', message: `Option ${names} requires a value`, path: [] },
		]);
	}
}

/**
 * Throw a ValidationError (exit 2) on the first parseArgs-produced key that
 * is not registered, with a did-you-mean suggestion when a candidate is close.
 */
export function assertKnownOptions(input: AssertKnownOptionsInput): void {
	const { producedKeys, knownKeys, booleanKeys, suggestionCandidates, tokens = [] } = input;

	for (const key of producedKeys) {
		if (knownKeys.has(key)) continue;

		// Defensive allowance: on Node 24, parseArgs folds `--no-x` into
		// `x: false` even for unregistered keys (see parseargs-negation.test.ts),
		// so `no-*` keys never appear today — this guards a future Node line
		// surfacing the negation token un-folded.
		if (key.startsWith('no-') && booleanKeys.has(key.slice(3))) continue;

		const flag = tokens.find(({ name }) => name === key)?.rawName ?? renderFlag(key);
		const suggestion = suggestFlag(key, suggestionCandidates);
		const message = suggestion
			? `Unknown option: ${flag}. Did you mean '${renderFlag(suggestion)}'?`
			: `Unknown option: ${flag}`;

		throw new ValidationError([{ code: 'custom', message, path: [] }]);
	}
}
