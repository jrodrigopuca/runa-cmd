import type { CLISchema } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { generateZshCompletions } from '../generators/zsh.js';

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

describe('generateZshCompletions', () => {
	const output = generateZshCompletions(testSchema, 'mycli');

	it('matches snapshot', () => {
		expect(output).toMatchSnapshot();
	});

	it('starts with #compdef mycli', () => {
		expect(output.startsWith('#compdef mycli')).toBe(true);
	});

	it('defines _mycli function', () => {
		expect(output).toContain('_mycli() {');
	});

	it('calls _mycli at the end', () => {
		expect(output.trimEnd().endsWith('_mycli')).toBe(true);
	});

	it('uses _describe for command listing', () => {
		expect(output).toContain("_describe 'command' commands");
	});

	it('includes _arguments with option specs', () => {
		expect(output).toContain('_arguments -C');
	});

	it('has enum completions inline :(staging prod)', () => {
		expect(output).toContain(':(staging prod)');
	});

	it('includes --no-verbose for boolean option', () => {
		expect(output).toContain('--no-verbose');
	});

	it('generates nested function for config subcommands', () => {
		expect(output).toContain('_mycli_config() {');
		expect(output).toContain('_mycli_config_set');
		expect(output).toContain('_mycli_config_get');
	});

	it('includes global options in _arguments', () => {
		expect(output).toContain('--help');
		expect(output).toContain('--verbose');
		expect(output).toContain('--format');
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
		const result = generateZshCompletions(emptySchema, 'empty');
		expect(result).toContain('#compdef empty');
		expect(result).toContain('_empty() {');
		expect(result.trimEnd().endsWith('_empty')).toBe(true);
	});
});
