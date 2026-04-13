import type { CLISchema } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { generateBashCompletions } from '../generators/bash.js';

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

describe('generateBashCompletions', () => {
	const output = generateBashCompletions(testSchema, 'mycli');

	it('matches snapshot', () => {
		expect(output).toMatchSnapshot();
	});

	it('uses underscored function name for hyphenated binName', () => {
		const result = generateBashCompletions(testSchema, 'my-tool');
		expect(result).toContain('_my_tool_completions');
	});

	it('ends with complete -F registration', () => {
		expect(output).toContain('complete -F _mycli_completions mycli');
	});

	it('completes top-level commands deploy and config', () => {
		expect(output).toContain("'deploy config'");
	});

	it('completes nested subcommands set and get under config', () => {
		expect(output).toContain("'set get'");
	});

	it('includes option names for deploy', () => {
		expect(output).toContain('--environment');
		expect(output).toContain('--force');
		expect(output).toContain('--replicas');
	});

	it('includes short alias -e', () => {
		expect(output).toContain('-e');
	});

	it('completes enum values staging/prod after --environment or -e', () => {
		expect(output).toContain('--environment|-e)');
		expect(output).toContain("'staging prod'");
	});

	it('includes both --force and --no-force for booleans', () => {
		expect(output).toContain('--force');
		expect(output).toContain('--no-force');
	});

	it('includes global options --help, --verbose, --format everywhere', () => {
		expect(output).toContain('--help');
		expect(output).toContain('--verbose');
		expect(output).toContain('--format');
		expect(output).toContain('-h');
		expect(output).toContain('-v');
	});

	it('completes format enum values json/text/table after --format', () => {
		expect(output).toContain("'json text table'");
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
		const result = generateBashCompletions(emptySchema, 'empty');
		expect(result).toContain('complete -F _empty_completions empty');
		expect(result).toContain('_empty_completions()');
	});
});
