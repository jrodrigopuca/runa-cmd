/**
 * A computed default can show as text in help (T-217): `~/.beacon/control.sock`
 * instead of the path of whoever wrote the help, while the command still gets
 * the real value.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { getSchema } from '../introspect.js';
import { testCLI } from '../testing.js';

const socket = join(homedir(), '.beacon', 'control.sock');

const status = defineCommand({
	meta: {
		name: 'beacon',
		description: 'Show the status',
		options: { socket: { defaultDescription: '~/.beacon/control.sock' } },
	},
	options: { socket: z.string().default(socket).describe('Control socket') },
	run: ({ options }) => options.socket,
});

// In defineCLI the key names the command, so this one doesn't declare a name
const show = defineCommand({ meta: { description: 'Show the status' }, run: () => 'ok' });

const cli = defineCLI({
	meta: { name: 'beacon', description: 'Watch a model' },
	commands: { status: show },
	globalOptions: { store: z.string().default(join(homedir(), '.beacon')).describe('Data folder') },
	globalMeta: { options: { store: { defaultDescription: '~/.beacon' } } },
});

describe('defaultDescription', () => {
	it('is what help shows as the default', async () => {
		const { stdout } = await testCLI(status, ['--help']);

		expect(stdout).toContain('(default: ~/.beacon/control.sock)');
		expect(stdout).not.toContain(homedir());
	});

	it('changes nothing about the value the command gets', async () => {
		const { stdout, code } = await testCLI(status, []);

		expect(code).toBe(0);
		expect(stdout).toBe(`${socket}\n`);
	});

	it('works on global options', async () => {
		const { stdout } = await testCLI(cli, ['status', '--help']);

		expect(stdout).toContain('(default: ~/.beacon)');
		expect(stdout).not.toContain(homedir());
	});

	it('reaches the schema that help plugins read, next to the real value', () => {
		const schema = getSchema({ meta: { name: 'beacon' }, commands: { beacon: status } });
		const option = schema.commands[0]?.options.find((o) => o.name === 'socket');

		expect(option?.defaultDescription).toBe('~/.beacon/control.sock');
		expect(option?.defaultValue).toBe(socket);
	});

	it('shows even when the value it stands for is false', async () => {
		const quiet = defineCommand({
			meta: {
				name: 'beacon',
				description: 'Status',
				options: { quiet: { defaultDescription: 'on in CI' } },
			},
			options: { quiet: z.boolean().default(false).describe('Print less') },
			run: () => {},
		});

		expect((await testCLI(quiet, ['--help'])).stdout).toContain('(default: on in CI)');
	});
});
