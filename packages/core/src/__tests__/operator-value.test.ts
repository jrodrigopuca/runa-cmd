/**
 * The MCP server checks the operator's values at startup with the rules the
 * CLI applies (T-255): what the terminal takes as text is fine, and a wrong
 * value is described with the terminal's words.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { operatorValueProblem } from '../parse/resolve.js';

describe('operatorValueProblem', () => {
	it.each([
		[z.number(), '5', 'env'],
		[z.number(), '5', 'config'],
		[z.number(), 5, 'config'],
		[z.boolean(), 'true', 'env'],
		[z.enum(['low', 'high']), 'high', 'env'],
		[z.array(z.string()), 'a, b', 'env'],
	] as const)('%o takes %j from %s', (schema, value, source) => {
		expect(operatorValueProblem(schema, value, source)).toBeUndefined();
	});

	it.each([
		[z.number(), 'big', 'expected number'],
		[z.number().positive(), '0', 'must be greater than 0'],
		[z.enum(['low', 'high']), 'extreme', 'expected one of: low, high'],
		[z.boolean(), 1, 'expected true or false'],
	] as const)('%o says why %j is wrong', (schema, value, reason) => {
		expect(operatorValueProblem(schema, value, 'config')).toBe(reason);
	});
});
