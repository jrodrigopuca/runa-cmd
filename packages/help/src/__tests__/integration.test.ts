/**
 * Integration tests — defineCLI + helpPlugin + --help end-to-end
 *
 * Tests the full pipeline: defineCLI with helpPlugin, --help triggers
 * help rendering and exits. Tests both root and subcommand help.
 */

import { defineCLI, defineCommand } from '@runa-cmd/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { strip } from '../ansi/codes.js';
import { resetRenderContext } from '../ansi/detect.js';
import { helpPlugin } from '../plugin.js';

// ─── Setup / Teardown ───────────────────────────────────────

let exitSpy: ReturnType<typeof vi.spyOn>;
let writeSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	resetRenderContext();
	// Mock process.exit to prevent actually exiting
	exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	// Capture stdout.write output
	writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
	// Force no-color for consistent test output
	process.env.NO_COLOR = '';
});

afterEach(() => {
	exitSpy.mockRestore();
	writeSpy.mockRestore();
	delete process.env.NO_COLOR;
});

// ─── Helpers ────────────────────────────────────────────────

function getCapturedOutput(): string {
	if (writeSpy.mock.calls.length === 0) return '';
	return strip(writeSpy.mock.calls[0]![0] as string);
}

// ─── Integration Tests ──────────────────────────────────────

describe('integration — defineCLI + helpPlugin', () => {
	it('--help on root shows CLI help and exits', async () => {
		const serve = defineCommand({
			meta: { name: 'serve', description: 'Start dev server' },
			options: { port: z.number().default(3000).describe('Port number') },
			run: () => {},
		});

		const cli = defineCLI({
			meta: { name: 'myapp', version: '2.0.0', description: 'My awesome app' },
			commands: { serve },
			plugins: [helpPlugin()],
		});

		await cli.run(['--help']);

		expect(exitSpy).toHaveBeenCalledWith(0);
		const output = getCapturedOutput();
		expect(output).toContain('myapp');
		expect(output).toContain('v2.0.0');
		expect(output).toContain('My awesome app');
		expect(output).toContain('USAGE');
		expect(output).toContain('COMMANDS');
		expect(output).toContain('serve');
	});

	it('-h shorthand works as --help on subcommand', async () => {
		const serve = defineCommand({
			meta: { name: 'serve', description: 'Start server' },
			run: () => {},
		});

		const cli = defineCLI({
			meta: { name: 'myapp' },
			commands: { serve },
			plugins: [helpPlugin()],
		});

		await cli.run(['serve', '-h']);

		expect(exitSpy).toHaveBeenCalledWith(0);
		const output = getCapturedOutput();
		expect(output).toContain('serve');
	});

	it('--help on subcommand shows command help', async () => {
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy the app' },
			args: { target: z.string().describe('Deploy target') },
			options: {
				force: z.boolean().default(false).describe('Force deploy'),
			},
			run: () => {},
		});

		const cli = defineCLI({
			meta: { name: 'myapp', version: '1.0.0' },
			commands: { deploy },
			plugins: [helpPlugin()],
		});

		await cli.run(['deploy', '--help']);

		expect(exitSpy).toHaveBeenCalledWith(0);
		const output = getCapturedOutput();
		expect(output).toContain('deploy');
		expect(output).toContain('Deploy the app');
		expect(output).toContain('--force');
	});

	it('helpPlugin with custom theme still renders', async () => {
		const cli = defineCLI({
			meta: { name: 'themed-app' },
			commands: {},
			plugins: [helpPlugin({ theme: { primary: '#00FF00' } })],
		});

		await cli.run(['--help']);

		expect(exitSpy).toHaveBeenCalledWith(0);
		const output = getCapturedOutput();
		expect(output).toContain('themed-app');
	});

	it('helpPlugin with custom render function', async () => {
		const customRender = vi.fn().mockReturnValue('=== CUSTOM HELP ===');

		const cli = defineCLI({
			meta: { name: 'custom-app' },
			commands: {},
			plugins: [helpPlugin({ render: customRender })],
		});

		await cli.run(['--help']);

		expect(exitSpy).toHaveBeenCalledWith(0);
		expect(customRender).toHaveBeenCalledTimes(1);
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain('=== CUSTOM HELP ===');
	});

	it('does not trigger help when --help is not passed', async () => {
		const runFn = vi.fn();
		const serve = defineCommand({
			meta: { name: 'serve', description: 'Start server' },
			run: runFn,
		});

		const cli = defineCLI({
			meta: { name: 'myapp' },
			commands: { serve },
			plugins: [helpPlugin()],
		});

		await cli.run(['serve']);

		// Help should NOT have been triggered
		expect(exitSpy).not.toHaveBeenCalled();
		expect(runFn).toHaveBeenCalled();
	});
});
