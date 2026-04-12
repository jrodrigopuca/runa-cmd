/**
 * Unit tests for defaultRenderer (render.ts)
 *
 * Tests: full render in raw mode, all sections present, required markers,
 *        defaults, enums, empty sections skipped, groups
 */

import type { CLISchema, CommandSchema } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { strip } from '../ansi/codes.js';
import { defaultRenderer } from '../render.js';
import { resolveTheme } from '../theme.js';
import type { RenderContext, RenderFnCtx } from '../types.js';

// ─── Helpers ────────────────────────────────────────────────

const RAW: RenderContext = { colorDepth: 'none', termWidth: 80 };

function makeRenderCtx(schema: CLISchema | CommandSchema): RenderFnCtx {
	return {
		schema,
		theme: resolveTheme(undefined, RAW),
		colorDepth: RAW.colorDepth,
		termWidth: RAW.termWidth,
	};
}

function renderRaw(schema: CLISchema | CommandSchema): string {
	return strip(defaultRenderer(makeRenderCtx(schema)));
}

// ─── CLI Schema Fixtures ────────────────────────────────────

const minimalCLI: CLISchema = {
	meta: { name: 'mycli' },
	commands: [],
	globalOptions: [],
};

const fullCLI: CLISchema = {
	meta: { name: 'mycli', version: '1.0.0', description: 'A test CLI tool' },
	commands: [
		{
			name: 'serve',
			description: 'Start the server',
			fullPath: ['serve'],
			args: [],
			options: [],
			hasOutput: false,
		},
		{
			name: 'build',
			description: 'Build the project',
			fullPath: ['build'],
			args: [],
			options: [],
			hasOutput: false,
		},
	],
	globalOptions: [
		{
			name: 'verbose',
			description: 'Enable verbose output',
			type: 'boolean',
			required: false,
			alias: ['v'],
		},
		{
			name: 'config',
			description: 'Config file path',
			type: 'string',
			required: false,
			defaultValue: './config.json',
			alias: ['c'],
		},
	],
};

const commandWithArgs: CommandSchema = {
	name: 'deploy',
	description: 'Deploy the application',
	fullPath: ['deploy'],
	args: [
		{
			name: 'target',
			description: 'Deployment target',
			type: 'enum',
			required: true,
			isVariadic: false,
			enumValues: ['staging', 'production'],
		},
		{
			name: 'files',
			description: 'Files to deploy',
			type: 'string',
			required: false,
			isVariadic: true,
			defaultValue: '.',
		},
	],
	options: [
		{
			name: 'force',
			description: 'Force deploy',
			type: 'boolean',
			required: false,
			alias: ['f'],
		},
		{
			name: 'port',
			description: 'Server port',
			type: 'number',
			required: true,
			defaultValue: 3000,
		},
		{
			name: 'format',
			description: 'Output format',
			type: 'enum',
			required: false,
			enumValues: ['json', 'yaml', 'toml'],
		},
		{
			name: 'timeout',
			description: 'Old timeout option',
			type: 'number',
			required: false,
			deprecated: 'use --deadline instead',
		},
		{
			name: 'region',
			description: 'AWS region',
			type: 'string',
			required: false,
			env: 'AWS_REGION',
		},
	],
	hasOutput: false,
};

const commandWithGroups: CommandSchema = {
	name: 'run',
	description: 'Run something',
	fullPath: ['run'],
	args: [],
	options: [
		{
			name: 'verbose',
			description: 'Verbose output',
			type: 'boolean',
			required: false,
		},
		{
			name: 'host',
			description: 'Server host',
			type: 'string',
			required: false,
			group: 'network',
		},
		{
			name: 'port',
			description: 'Server port',
			type: 'number',
			required: false,
			group: 'network',
		},
	],
	hasOutput: false,
};

// ─── CLI Root Rendering ─────────────────────────────────────

describe('defaultRenderer — CLI root', () => {
	it('renders minimal CLI (name only)', () => {
		const output = renderRaw(minimalCLI);
		expect(output).toContain('mycli');
		expect(output).toContain('USAGE');
	});

	it('renders name + version in header', () => {
		const output = renderRaw(fullCLI);
		expect(output).toContain('mycli v1.0.0');
	});

	it('renders description', () => {
		const output = renderRaw(fullCLI);
		expect(output).toContain('A test CLI tool');
	});

	it('renders USAGE section with <command>', () => {
		const output = renderRaw(fullCLI);
		expect(output).toContain('mycli <command> [options]');
	});

	it('renders COMMANDS section', () => {
		const output = renderRaw(fullCLI);
		expect(output).toContain('COMMANDS');
		expect(output).toContain('serve');
		expect(output).toContain('Start the server');
		expect(output).toContain('build');
		expect(output).toContain('Build the project');
	});

	it('renders GLOBAL OPTIONS section', () => {
		const output = renderRaw(fullCLI);
		expect(output).toContain('GLOBAL OPTIONS');
		expect(output).toContain('--verbose');
		expect(output).toContain('-v');
		expect(output).toContain('--config');
		expect(output).toContain('-c');
	});

	it('renders default values in global options', () => {
		const output = renderRaw(fullCLI);
		expect(output).toContain('[default: ./config.json]');
	});

	it('skips COMMANDS section when no commands', () => {
		const output = renderRaw(minimalCLI);
		expect(output).not.toContain('COMMANDS');
	});

	it('skips GLOBAL OPTIONS section when no options', () => {
		const output = renderRaw(minimalCLI);
		expect(output).not.toContain('GLOBAL OPTIONS');
	});
});

// ─── Command Rendering ──────────────────────────────────────

describe('defaultRenderer — command', () => {
	it('renders command name in header', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('deploy');
	});

	it('renders description', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('Deploy the application');
	});

	it('renders USAGE with args', () => {
		const output = renderRaw(commandWithArgs);
		// Required arg in <>, optional in []
		expect(output).toContain('<target>');
		expect(output).toContain('[files...]');
	});

	it('renders ARGUMENTS section', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('ARGUMENTS');
		expect(output).toContain('target');
		expect(output).toContain('Deployment target');
	});

	it('renders required marker for args', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('(required)');
	});

	it('renders enum values for args', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('staging | production');
	});

	it('renders default value for args', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('[default: .]');
	});

	it('renders OPTIONS section', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('OPTIONS');
		expect(output).toContain('--force');
		expect(output).toContain('-f');
	});

	it('renders option type for non-boolean options', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('number');
	});

	it('renders enum values for options', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('json | yaml | toml');
	});

	it('renders required marker for options', () => {
		const output = renderRaw(commandWithArgs);
		// port is required
		expect(output).toContain('(required)');
	});

	it('renders default value for options', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('[default: 3000]');
	});

	it('renders deprecated marker', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('(deprecated: use --deadline instead)');
	});

	it('renders env var marker', () => {
		const output = renderRaw(commandWithArgs);
		expect(output).toContain('[env: AWS_REGION]');
	});
});

// ─── Grouped Options ────────────────────────────────────────

describe('defaultRenderer — grouped options', () => {
	it('renders ungrouped options under OPTIONS', () => {
		const output = renderRaw(commandWithGroups);
		expect(output).toContain('OPTIONS');
		expect(output).toContain('--verbose');
	});

	it('renders grouped options under their group title', () => {
		const output = renderRaw(commandWithGroups);
		expect(output).toContain('NETWORK OPTIONS');
		expect(output).toContain('--host');
		expect(output).toContain('--port');
	});
});

// ─── Command with Subcommands ───────────────────────────────

describe('defaultRenderer — subcommands', () => {
	it('renders COMMANDS section for command with subcommands', () => {
		const cmd: CommandSchema = {
			name: 'config',
			description: 'Manage config',
			fullPath: ['config'],
			args: [],
			options: [],
			hasOutput: false,
			subcommands: [
				{
					name: 'get',
					description: 'Get a config value',
					fullPath: ['config', 'get'],
					args: [],
					options: [],
					hasOutput: false,
				},
				{
					name: 'set',
					description: 'Set a config value',
					fullPath: ['config', 'set'],
					args: [],
					options: [],
					hasOutput: false,
				},
			],
		};
		const output = renderRaw(cmd);
		expect(output).toContain('COMMANDS');
		expect(output).toContain('get');
		expect(output).toContain('Set a config value');
	});

	it('renders <command> in USAGE when subcommands exist', () => {
		const cmd: CommandSchema = {
			name: 'config',
			description: 'Manage config',
			fullPath: ['config'],
			args: [],
			options: [],
			hasOutput: false,
			subcommands: [
				{
					name: 'get',
					description: 'Get',
					fullPath: ['config', 'get'],
					args: [],
					options: [],
					hasOutput: false,
				},
			],
		};
		const output = renderRaw(cmd);
		expect(output).toContain('config <command>');
	});
});
