import { describe, expect, it } from 'vitest';
import { escapeFishValue, escapeZshExplanation, escapeZshValue } from '../generators/escape.js';

describe('escapeZshExplanation', () => {
	it('escapes what ends the explanation: after a ], zsh reads an action to run', () => {
		expect(escapeZshExplanation('Mode [x]: how fast')).toBe('Mode \\[x\\]\\: how fast');
	});

	it('leaves plain text alone', () => {
		expect(escapeZshExplanation('Plain text')).toBe('Plain text');
	});

	it('keeps a single quote safe for the single-quoted spec', () => {
		expect(escapeZshExplanation("It's")).toBe("It'\\''s");
	});
});

describe('escapeZshValue', () => {
	it('keeps a space inside the value', () => {
		expect(escapeZshValue('very slow')).toBe('very\\ slow');
	});

	it('escapes what would close the list', () => {
		expect(escapeZshValue('a)b')).toBe('a\\)b');
	});
});

describe('escapeFishValue', () => {
	it('leaves a value without spaces alone', () => {
		expect(escapeFishValue('fast')).toBe('fast');
	});

	it('quotes a value with a space, for the single-quoted list', () => {
		expect(escapeFishValue('very slow')).toBe("\\'very slow\\'");
	});
});
