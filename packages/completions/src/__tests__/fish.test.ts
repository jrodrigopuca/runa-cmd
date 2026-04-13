import type { CLISchema } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { generateFishCompletions } from '../generators/fish.js';

const testSchema: CLISchema = {
	meta: { name: 'mycli', version: '1.0.0', description: 'Test CLI' },
	commands: [
		{
			name: 'deploy',
			description: 'Deploy the app',
			fullPath: ['deploy'],
			args: [
				{
					name: 'service',
					type: 'string',
					required: true,
					isVariadic: false,
				},
			],
			options: [
				{
					name: 'environment',
					type: 'enum',
					required: false,
					alias: ['-e'],
					enumValues: ['staging', 'prod'],
					description: 'Target environment',
				},
				{
					name: 'force',
					type: 'boolean',
					required: false,
					description: 'Force deploy without confirmation',
				},
				{
					name: 'replicas',
					type: 'number',
					required: false,
					description: 'Number of replicas',
				},
			],
			hasOutput: false,
		},
		{
			name: 'config',
			description: 'Manage configuration',
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
					options: [
						{
							name: 'global',
							type: 'boolean',
							required: false,
							alias: ['-g'],
							description: 'Set globally',
						},
					],
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
					hasOutput: true,
				},
			],
		},
	],
	globalOptions: [
		{
			name: 'help',
			type: 'boolean',
			required: false,
			alias: ['-h'],
			description: 'Show help',
		},
		{
			name: 'verbose',
			type: 'boolean',
			required: false,
			alias: ['-v'],
			description: 'Enable verbose output',
		},
		{
			name: 'format',
			type: 'enum',
			required: false,
			enumValues: ['json', 'text', 'table'],
			description: 'Output format',
		},
	],
};

describe('generateFishCompletions', () => {
	const output = generateFishCompletions(testSchema, 'mycli');

	it('matches snapshot', () => {
		expect(output).toMatchSnapshot();
	});

	it('starts with complete -c mycli -f', () => {
		expect(output).toContain('complete -c mycli -f');
	});

	it('uses __fish_use_subcommand for top-level commands', () => {
		expect(output).toContain("__fish_use_subcommand' -a 'deploy'");
		expect(output).toContain("__fish_use_subcommand' -a 'config'");
	});

	it('uses __fish_seen_subcommand_from for config subcommands', () => {
		expect(output).toContain("__fish_seen_subcommand_from config' -a 'set'");
		expect(output).toContain("__fish_seen_subcommand_from config' -a 'get'");
	});

	it('includes -l, -s, -d for options', () => {
		expect(output).toContain('-l environment');
		expect(output).toContain('-s e');
		expect(output).toContain("-d 'Target environment'");
	});

	it('includes -r for non-boolean options', () => {
		expect(output).toContain('-l environment');
		// environment line should have -r
		const envLine = output.split('\n').find((l) => l.includes('-l environment'));
		expect(envLine).toContain('-r');
	});

	it('does not include -r for boolean options', () => {
		const forceLine = output
			.split('\n')
			.find((l) => l.includes('-l force') && !l.includes('-l no-force'));
		expect(forceLine).toBeDefined();
		expect(forceLine).not.toContain('-r');
	});

	it('includes -a with enum values', () => {
		expect(output).toContain("-a 'staging prod'");
	});

	it('includes --no-force as separate directive', () => {
		expect(output).toContain('-l no-force');
	});

	it('includes global options without -n condition', () => {
		const helpLines = output
			.split('\n')
			.filter((l) => l.includes('-l help') && !l.includes('-l no-help') && !l.includes("-n '"));
		// Global help should have no -n condition
		expect(helpLines.length).toBeGreaterThan(0);
	});

	it('handles empty commands array', () => {
		const emptySchema: CLISchema = {
			meta: {
				name: 'empty',
				version: '0.0.0',
				description: '',
			},
			commands: [],
			globalOptions: [],
		};
		const result = generateFishCompletions(emptySchema, 'empty');
		expect(result).toContain('complete -c empty -f');
	});
});
