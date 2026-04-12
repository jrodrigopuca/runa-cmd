/**
 * Tests for buildToolRegistrations() — Command → MCP tool mapping
 */

import type { CLISchema, CommandTree } from '@runa-cmd/core';
import { defineCommand } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildToolRegistrations } from '../schema.js';

// ─── Helpers ────────────────────────────────────────────────

function makeCLISchema(commands: CLISchema['commands'] = []): CLISchema {
	return {
		meta: { name: 'test-cli', version: '1.0.0', description: 'Test CLI' },
		commands,
		globalOptions: [],
	};
}

// ─── Tests ──────────────────────────────────────────────────

describe('buildToolRegistrations', () => {
	it('maps a simple command with options', () => {
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy the app' },
			options: { env: z.enum(['staging', 'prod']).describe('Target environment') },
			run() {},
		});

		const commands: CommandTree = { deploy };
		const schema = makeCLISchema([
			{
				name: 'deploy',
				description: 'Deploy the app',
				fullPath: ['deploy'],
				args: [],
				options: [
					{
						name: 'env',
						description: 'Target environment',
						type: 'enum',
						required: true,
						enumValues: ['staging', 'prod'],
					},
				],
				hasOutput: false,
			},
		]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.name).toBe('deploy');
		expect(regs[0]?.description).toBe('Deploy the app');
		expect(regs[0]?.optionKeys).toEqual(new Set(['env']));
		expect(regs[0]?.argKeys).toEqual(new Set());
		expect(regs[0]?.inputShape).toHaveProperty('env');
		expect(regs[0]?.outputSchema).toBeUndefined();
	});

	it('maps a command with args and options', () => {
		const greet = defineCommand({
			meta: { name: 'greet', description: 'Greet someone' },
			args: { name: z.string().describe('Person to greet') },
			options: { loud: z.boolean().optional().default(false).describe('Shout') },
			run() {},
		});

		const commands: CommandTree = { greet };
		const schema = makeCLISchema([
			{
				name: 'greet',
				description: 'Greet someone',
				fullPath: ['greet'],
				args: [
					{
						name: 'name',
						description: 'Person to greet',
						type: 'string',
						required: true,
						isVariadic: false,
					},
				],
				options: [
					{
						name: 'loud',
						description: 'Shout',
						type: 'boolean',
						required: false,
						defaultValue: false,
					},
				],
				hasOutput: false,
			},
		]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.argKeys).toEqual(new Set(['name']));
		expect(regs[0]?.optionKeys).toEqual(new Set(['loud']));
		expect(regs[0]?.inputShape).toHaveProperty('name');
		expect(regs[0]?.inputShape).toHaveProperty('loud');
	});

	it('maps a command with output schema', () => {
		const status = defineCommand({
			meta: { name: 'status', description: 'Get status' },
			output: z.object({ ok: z.boolean(), message: z.string() }),
			run() {
				return { ok: true, message: 'All good' };
			},
		});

		const commands: CommandTree = { status };
		const schema = makeCLISchema([
			{
				name: 'status',
				description: 'Get status',
				fullPath: ['status'],
				args: [],
				options: [],
				hasOutput: true,
			},
		]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.outputSchema).toBeDefined();
		expect(regs[0]?.argKeys).toEqual(new Set());
		expect(regs[0]?.optionKeys).toEqual(new Set());
	});

	it('maps a command with no args and no options', () => {
		const ping = defineCommand({
			meta: { name: 'ping', description: 'Ping the server' },
			run() {},
		});

		const commands: CommandTree = { ping };
		const schema = makeCLISchema([
			{
				name: 'ping',
				description: 'Ping the server',
				fullPath: ['ping'],
				args: [],
				options: [],
				hasOutput: false,
			},
		]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.name).toBe('ping');
		expect(Object.keys(regs[0]?.inputShape ?? {})).toHaveLength(0);
	});

	it('maps nested subcommands with underscore-joined names', () => {
		const set = defineCommand({
			meta: { name: 'set', description: 'Set a config value' },
			args: { key: z.string(), value: z.string() },
			run() {},
		});

		const get = defineCommand({
			meta: { name: 'get', description: 'Get a config value' },
			args: { key: z.string() },
			run() {},
		});

		const commands: CommandTree = {
			config: { set, get },
		};

		const schema = makeCLISchema([
			{
				name: 'config',
				description: '',
				fullPath: ['config'],
				args: [],
				options: [],
				hasOutput: false,
				subcommands: [
					{
						name: 'set',
						description: 'Set a config value',
						fullPath: ['config', 'set'],
						args: [
							{
								name: 'key',
								type: 'string',
								required: true,
								isVariadic: false,
							},
							{
								name: 'value',
								type: 'string',
								required: true,
								isVariadic: false,
							},
						],
						options: [],
						hasOutput: false,
					},
					{
						name: 'get',
						description: 'Get a config value',
						fullPath: ['config', 'get'],
						args: [
							{
								name: 'key',
								type: 'string',
								required: true,
								isVariadic: false,
							},
						],
						options: [],
						hasOutput: false,
					},
				],
			},
		]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(2);
		const names = regs.map((r) => r.name).sort();
		expect(names).toEqual(['config_get', 'config_set']);

		const setReg = regs.find((r) => r.name === 'config_set');
		expect(setReg?.argKeys).toEqual(new Set(['key', 'value']));
		expect(setReg?.description).toBe('Set a config value');
	});

	it('skips group nodes (non-leaf) and only maps leaf commands', () => {
		const leaf = defineCommand({
			meta: { name: 'leaf', description: 'A leaf command' },
			run() {},
		});

		const commands: CommandTree = {
			group: { leaf },
		};

		const schema = makeCLISchema([]);
		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.name).toBe('group_leaf');
	});

	it('handles multiple top-level commands', () => {
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy' },
			run() {},
		});

		const rollback = defineCommand({
			meta: { name: 'rollback', description: 'Rollback' },
			run() {},
		});

		const commands: CommandTree = { deploy, rollback };
		const schema = makeCLISchema([
			{
				name: 'deploy',
				description: 'Deploy',
				fullPath: ['deploy'],
				args: [],
				options: [],
				hasOutput: false,
			},
			{
				name: 'rollback',
				description: 'Rollback',
				fullPath: ['rollback'],
				args: [],
				options: [],
				hasOutput: false,
			},
		]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(2);
		const names = regs.map((r) => r.name).sort();
		expect(names).toEqual(['deploy', 'rollback']);
	});

	it('falls back to command meta description when not found in CLISchema', () => {
		const unknown = defineCommand({
			meta: { name: 'unknown', description: 'From meta' },
			run() {},
		});

		const commands: CommandTree = { unknown };
		const schema = makeCLISchema([]); // empty — no matching CommandSchema

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.description).toBe('From meta');
	});

	it('maps variadic args correctly', () => {
		const install = defineCommand({
			meta: { name: 'install', description: 'Install packages' },
			args: { packages: z.array(z.string()).describe('Packages to install') },
			run() {},
		});

		const commands: CommandTree = { install };
		const schema = makeCLISchema([]);

		const regs = buildToolRegistrations(commands, schema);

		expect(regs).toHaveLength(1);
		expect(regs[0]?.argKeys).toEqual(new Set(['packages']));
		expect(regs[0]?.inputShape).toHaveProperty('packages');
	});
});
