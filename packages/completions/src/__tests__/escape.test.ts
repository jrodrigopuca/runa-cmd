import { describe, expect, it } from 'vitest';
import { escapeBash, escapeFish, escapeZsh } from '../generators/escape.js';

describe('escapeBash', () => {
	it('passes plain strings through unchanged', () => {
		expect(escapeBash('hello world')).toBe('hello world');
	});

	it("escapes single quotes with '\\''", () => {
		expect(escapeBash("Don't stop")).toBe("Don'\\''t stop");
	});

	it('leaves backslashes as-is (literal in single quotes)', () => {
		expect(escapeBash('path\\to\\file')).toBe('path\\to\\file');
	});

	it('leaves dollar signs as-is', () => {
		expect(escapeBash('$HOME')).toBe('$HOME');
	});

	it('leaves backticks as-is', () => {
		expect(escapeBash('`cmd`')).toBe('`cmd`');
	});

	it('leaves double quotes as-is', () => {
		expect(escapeBash('say "hi"')).toBe('say "hi"');
	});

	it('collapses newlines to spaces', () => {
		expect(escapeBash('line1\nline2\nline3')).toBe('line1 line2 line3');
	});

	it('returns empty string for empty input', () => {
		expect(escapeBash('')).toBe('');
	});

	it('handles multiple single quotes', () => {
		expect(escapeBash("it's a 'test'")).toBe("it'\\''s a '\\''test'\\''");
	});

	it('truncates descriptions longer than 80 chars', () => {
		const long = 'A'.repeat(100);
		const result = escapeBash(long);
		expect(result.length).toBeLessThanOrEqual(80);
		expect(result.endsWith('\u2026')).toBe(true);
	});

	it('collapses multiple whitespace to single space', () => {
		expect(escapeBash('hello   \n\n  world')).toBe('hello world');
	});
});

describe('escapeZsh', () => {
	it('passes plain strings through unchanged', () => {
		expect(escapeZsh('hello world')).toBe('hello world');
	});

	it("escapes single quotes with '\\''", () => {
		expect(escapeZsh("Don't")).toBe("Don'\\''t");
	});

	it('leaves backslashes as-is', () => {
		expect(escapeZsh('a\\b')).toBe('a\\b');
	});

	it('collapses newlines to spaces', () => {
		expect(escapeZsh('a\nb')).toBe('a b');
	});

	it('returns empty string for empty input', () => {
		expect(escapeZsh('')).toBe('');
	});

	it('truncates at 80 chars', () => {
		const long = 'B'.repeat(90);
		const result = escapeZsh(long);
		expect(result.length).toBeLessThanOrEqual(80);
	});
});

describe('escapeFish', () => {
	it('passes plain strings through unchanged', () => {
		expect(escapeFish('hello world')).toBe('hello world');
	});

	it("escapes single quotes with \\'", () => {
		expect(escapeFish("Don't")).toBe("Don\\'t");
	});

	it('escapes backslashes with \\\\', () => {
		expect(escapeFish('a\\b')).toBe('a\\\\b');
	});

	it('escapes both backslashes and single quotes', () => {
		expect(escapeFish("a\\'b")).toBe("a\\\\\\'b");
	});

	it('leaves dollar signs as-is', () => {
		expect(escapeFish('$HOME')).toBe('$HOME');
	});

	it('collapses newlines to spaces', () => {
		expect(escapeFish('a\nb')).toBe('a b');
	});

	it('returns empty string for empty input', () => {
		expect(escapeFish('')).toBe('');
	});

	it('truncates at 80 chars', () => {
		const long = 'C'.repeat(100);
		const result = escapeFish(long);
		expect(result.length).toBeLessThanOrEqual(80);
	});
});
