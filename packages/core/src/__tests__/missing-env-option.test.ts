/**
 * A required option that can come from env names its variable when it's
 * missing (T-216): whoever runs the CLI, or operates an MCP server, learns
 * what to set. The message never shows a value.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { testCLI } from '../testing.js';

const migrate = defineCommand({
	meta: {
		name: 'tool',
		description: 'Migrate the database',
		options: { database: { env: 'TOOL_DATABASE_URL' } },
	},
	options: {
		database: z.string().describe('Database to migrate'),
		steps: z.number().describe('How many migrations to run'),
	},
	run: () => 'ok',
});

const firstLine = (stderr: string) => stderr.split('\n')[0];

describe('a missing required option', () => {
	it('names its variable when it declares one', async () => {
		const { code, stderr } = await testCLI(migrate, ['--steps', '1'], { env: {} });

		expect(code).toBe(2);
		expect(firstLine(stderr)).toBe('Missing required option: --database, or set TOOL_DATABASE_URL');
	});

	it('stays as it was without a variable', async () => {
		const { stderr } = await testCLI(migrate, [], {
			env: { TOOL_DATABASE_URL: 'postgres://localhost/app' },
		});

		expect(firstLine(stderr)).toBe('Missing required option: --steps');
	});

	it('shows no value, not even of other variables', async () => {
		const { stderr } = await testCLI(migrate, ['--steps', '1'], {
			env: { OTHER_SECRET: 'hunter2' },
		});

		expect(stderr).not.toContain('hunter2');
	});

	it('works on global options', async () => {
		const cli = defineCLI({
			meta: { name: 'tool', description: 'Manage the app' },
			commands: { status: defineCommand({ meta: { description: 'Status' }, run: () => 'ok' }) },
			globalOptions: { store: z.string().describe('Data folder') },
			globalMeta: { options: { store: { env: 'TOOL_STORE' } } },
		});

		const { code, stderr } = await testCLI(cli, ['status'], { env: {} });

		expect(code).toBe(2);
		expect(firstLine(stderr)).toBe('Missing required option: --store, or set TOOL_STORE');
	});
});

// A missing value is missing whatever its type: an enum or a literal said
// "Invalid value ... Expected one of" instead (T-241)
describe('a missing required value of any type', () => {
	// The main example of the core README, as it is
	const deploy = defineCommand({
		meta: {
			name: 'deploy',
			description: 'Deploy to an environment',
			options: { env: { alias: ['-e'], env: 'DEPLOY_ENV' }, replicas: { group: 'Scaling' } },
		},
		args: { service: z.string().describe('Service to deploy') },
		options: {
			env: z.enum(['staging', 'production']).describe('Target environment'),
			replicas: z.number().default(1).describe('Number of replicas'),
			dryRun: z.boolean().default(false).describe('Preview without deploying'),
		},
		output: z.object({ url: z.string(), replicas: z.number() }),
		run: ({ args, options }) => ({
			url: `https://${options.env}.example.com/${args.service}`,
			replicas: options.replicas,
		}),
	});

	it('the deploy example of the README says what its page promises', async () => {
		const { code, stderr } = await testCLI(deploy, ['api'], { env: {} });

		expect(code).toBe(2);
		expect(firstLine(stderr)).toBe('Missing required option: --env, or set DEPLOY_ENV');
	});

	it('a wrong enum value is still an invalid value', async () => {
		const { stderr } = await testCLI(deploy, ['api', '--env', 'mars'], { env: {} });
		expect(firstLine(stderr)).toBe('Invalid value for --env. Expected one of: staging, production');
	});

	const kinds = defineCommand({
		meta: { name: 'tool', description: 'Values of every kind' },
		args: { shell: z.enum(['bash', 'zsh']) },
		options: { mode: z.literal('fast'), level: z.enum(['low', 'high']) },
		run: () => 'ok',
	});

	it.each([
		[[], 'Missing required argument: <shell>'],
		[['bash', '--level', 'low'], 'Missing required option: --mode'],
		[['bash', '--mode', 'fast'], 'Missing required option: --level'],
	])('%j is missing, not invalid', async (argv, message) => {
		const { code, stderr } = await testCLI(kinds, argv, { env: {} });

		expect(code).toBe(2);
		expect(firstLine(stderr)).toBe(message);
	});
});
