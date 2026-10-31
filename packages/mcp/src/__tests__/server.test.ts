/**
 * Tests for tool definitions and for turning a child's outcome into a result.
 * Running real tools end to end lives in tools.test.ts.
 */
import { defineCommand } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ChildOutcome } from '../runner.js';
import { buildToolRegistrations, type ToolRegistration } from '../schema.js';
import { toolDefinition, toToolResult } from '../server.js';

function registration(config: Partial<Parameters<typeof defineCommand>[0]> = {}): ToolRegistration {
	const deploy = defineCommand({
		meta: { name: 'deploy', description: 'Deploy' },
		run() {},
		...config,
	} as Parameters<typeof defineCommand>[0]);

	const schema = { meta: { name: 'cli' }, commands: [], globalOptions: [] };
	return buildToolRegistrations({ deploy }, schema)[0] as ToolRegistration;
}

const outcome = (overrides: Partial<ChildOutcome> = {}): ChildOutcome => ({
	status: 0,
	stdout: '',
	stderr: '',
	reports: [{ kind: 'ran' }, { kind: 'result', value: undefined }],
	...overrides,
});

const text = (reg: ToolRegistration, out: ChildOutcome) => toToolResult(reg, out).content[0]?.text;

describe('toolDefinition', () => {
	it('describes a command without input as an empty object', () => {
		const definition = toolDefinition(registration());
		expect(definition.name).toBe('deploy');
		expect(definition.description).toBe('Deploy');
		expect(definition.inputSchema.type).toBe('object');
		expect(definition.inputSchema.properties).toEqual({});
	});

	it('merges args and options', () => {
		const definition = toolDefinition(
			registration({ args: { service: z.string() }, options: { env: z.string().optional() } }),
		);
		expect(Object.keys(definition.inputSchema.properties ?? {})).toEqual(['service', 'env']);
		expect(definition.inputSchema.required).toEqual(['service']);
	});

	it('declares an object output', () => {
		const definition = toolDefinition(registration({ output: z.object({ url: z.string() }) }));
		expect(definition.outputSchema?.type).toBe('object');
	});

	it('leaves out an output that is not an object: MCP does not allow it', () => {
		expect(toolDefinition(registration({ output: z.string() })).outputSchema).toBeUndefined();
	});
});

describe('toToolResult', () => {
	const reg = registration();
	const withOutput = registration({ output: z.object({ url: z.string() }) });
	const finishedWith = (value: unknown) =>
		outcome({ reports: [{ kind: 'ran' }, { kind: 'result', value }] });

	it('uses a success message when there is nothing to show', () => {
		expect(text(reg, outcome())).toBe("Command 'deploy' executed successfully.");
	});

	it('uses stdout when nothing was returned', () => {
		expect(text(reg, outcome({ stdout: 'Hello\n' }))).toBe('Hello');
	});

	it('prefers a returned value over stdout', () => {
		expect(text(reg, { ...finishedWith('value'), stdout: 'noise' })).toBe('value');
	});

	it('keeps a falsy returned value', () => {
		expect(text(reg, finishedWith(0))).toBe('0');
		expect(text(reg, finishedWith(false))).toBe('false');
	});

	it('adds structuredContent only with an object output schema', () => {
		const value = { url: 'x' };
		expect(toToolResult(withOutput, finishedWith(value)).structuredContent).toEqual(value);
		expect(toToolResult(reg, finishedWith(value)).structuredContent).toBeUndefined();
	});

	it('reports a failed command with what it wrote', () => {
		const result = toToolResult(reg, outcome({ status: 3, stderr: 'locked\n', reports: [] }));
		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe('locked');
	});

	it('falls back to the exit code when a failed command wrote nothing', () => {
		expect(text(reg, outcome({ status: 9, reports: [] }))).toContain('exited with code 9');
	});

	it('does not treat exit 0 as success without a result', () => {
		const result = toToolResult(reg, outcome({ reports: [] }));
		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toContain('did not finish');
	});
});
