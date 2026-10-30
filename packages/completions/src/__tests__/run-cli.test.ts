/**
 * Completions for a single command through runCLI (ADR-0023): the root
 * command's options belong at the top level, and it isn't a subcommand.
 */
import { defineCommand, runCLI } from '@runa-cmd/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { completionsPlugin } from '../plugin.js';

const tool = defineCommand({
	meta: { name: 'tool', description: 'Sample tool' },
	args: { content: z.string() },
	options: {
		size: z.number().default(10).describe('Module size'),
		level: z.enum(['low', 'high']).optional().describe('Level'),
	},
	run: () => {},
});

describe('runCLI + completionsPlugin', () => {
	let write: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
	});

	afterEach(() => {
		write.mockRestore();
	});

	async function script(shell: string): Promise<string> {
		await runCLI(tool, { argv: ['completions', shell], plugins: [completionsPlugin()] });
		return write.mock.calls.map(([chunk]) => String(chunk)).join('');
	}

	it.each(['bash', 'zsh', 'fish'])('%s offers the root options at the top level', async (shell) => {
		const output = await script(shell);
		expect(output).toContain('size');
		expect(output).toContain('low');
		expect(output).toContain('completions');
	});

	it('bash does not list the root command as a subcommand', async () => {
		const output = await script('bash');
		expect(output).not.toMatch(/\btool\)/);
		expect(output).not.toMatch(/compgen -W "[^"]*\btool\b/);
	});

	it('zsh does not list the root command as a subcommand', async () => {
		expect(await script('zsh')).not.toContain("'tool:");
	});

	it('fish does not list the root command as a subcommand', async () => {
		expect(await script('fish')).not.toContain('__fish_seen_subcommand_from tool');
	});
});
