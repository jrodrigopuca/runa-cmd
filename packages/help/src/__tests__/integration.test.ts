/**
 * Integration tests — defineCLI + helpPlugin + --help end-to-end
 *
 * Tests the full pipeline: defineCLI with helpPlugin, --help triggers
 * help rendering and short-circuits the lifecycle WITHOUT process.exit
 * (design D6): cli.run() resolves, cleanup hooks fire, embedders get
 * control back. Tests both root and subcommand help, plus the
 * `deploy --help` regression lock (spec 2.3) and rest-args trap (spec 1.3).
 */

import { defineCLI, defineCommand, definePlugin } from '@runa-cmd/core';
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

		expect(exitSpy).not.toHaveBeenCalled();
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

		expect(exitSpy).not.toHaveBeenCalled();
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

		expect(exitSpy).not.toHaveBeenCalled();
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

		expect(exitSpy).not.toHaveBeenCalled();
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

		expect(exitSpy).not.toHaveBeenCalled();
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

// ─── Help Lifecycle (design D6, spec 1.4) ───────────────────

describe('integration — help lifecycle without process.exit', () => {
	it('shortCircuit-without-exit: run() resolves, statements after await execute, no exit', async () => {
		const cli = defineCLI({
			meta: { name: 'embedded-app' },
			commands: {
				serve: defineCommand({
					meta: { name: 'serve', description: 'Start server' },
					run: () => {},
				}),
			},
			plugins: [helpPlugin()],
		});

		let afterAwaitExecuted = false;
		await cli.run(['--help']);
		afterAwaitExecuted = true;

		expect(afterAwaitExecuted).toBe(true);
		expect(exitSpy).not.toHaveBeenCalled();
		expect(getCapturedOutput()).toContain('embedded-app');
	});

	it('deploy --help: short-circuit prevents command execution', async () => {
		const runFn = vi.fn();
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy the app' },
			run: runFn,
		});

		const cli = defineCLI({
			meta: { name: 'myapp' },
			commands: { deploy },
			plugins: [helpPlugin()],
		});

		await cli.run(['deploy', '--help']);

		expect(getCapturedOutput()).toContain('deploy');
		expect(runFn).not.toHaveBeenCalled();
	});

	it('cleanup hook AND plugin cleanup() both fire, AFTER help output is written', async () => {
		const events: string[] = [];
		writeSpy.mockImplementation(() => {
			events.push('help-written');
			return true;
		});

		const cleanupPlugin = definePlugin({
			meta: { name: 'cleanup-recorder', version: '1.0.0' },
			setup: (api) => {
				api.hook('cleanup', () => {
					events.push('cleanup-hook');
				});
			},
			cleanup: () => {
				events.push('plugin-cleanup');
			},
		});

		const cli = defineCLI({
			meta: { name: 'myapp' },
			commands: {
				serve: defineCommand({
					meta: { name: 'serve', description: 'Start server' },
					run: () => {},
				}),
			},
			plugins: [helpPlugin(), cleanupPlugin],
		});

		await cli.run(['--help']);

		expect(events).toContain('help-written');
		expect(events).toContain('cleanup-hook');
		expect(events).toContain('plugin-cleanup');
		expect(events.indexOf('help-written')).toBeLessThan(events.indexOf('cleanup-hook'));
		expect(events.indexOf('help-written')).toBeLessThan(events.indexOf('plugin-cleanup'));
	});

	it('exitOnHelp: true → process.exit(0) called after render', async () => {
		const cli = defineCLI({
			meta: { name: 'legacy-app' },
			commands: {},
			plugins: [helpPlugin({ exitOnHelp: true })],
		});

		await cli.run(['--help']);

		expect(getCapturedOutput()).toContain('legacy-app');
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('rest-args trap (spec 1.3): exec -- --help does NOT render help; exec runs with rest', async () => {
		let receivedRest: string[] | undefined;
		const exec = defineCommand({
			meta: { name: 'exec', description: 'Run a command' },
			run: (ctx) => {
				receivedRest = ctx.rest;
			},
		});

		const cli = defineCLI({
			meta: { name: 'myapp' },
			commands: { exec },
			plugins: [helpPlugin()],
		});

		await cli.run(['exec', '--', '--help']);

		expect(writeSpy).not.toHaveBeenCalled();
		expect(receivedRest).toEqual(['--help']);
	});
});

// ─── Regression Lock: Subcommand Help Targeting (spec 2.3) ──

describe('integration — deploy --help regression lock', () => {
	function makeMultiCommandCLI() {
		const deploy = defineCommand({
			meta: {
				name: 'deploy',
				description: 'Deploy the application to an environment',
			},
			options: {
				environment: z.string().default('staging').describe('Target environment'),
			},
			run: () => {},
		});
		const status = defineCommand({
			meta: { name: 'status', description: 'Show deployment status' },
			run: () => {},
		});
		return defineCLI({
			meta: { name: 'myapp', version: '1.0.0' },
			commands: { deploy, status },
			plugins: [helpPlugin()],
		});
	}

	it("deploy --help renders deploy's help (description + --environment), NOT the root command list", async () => {
		const cli = makeMultiCommandCLI();
		await cli.run(['deploy', '--help']);

		const output = getCapturedOutput();
		expect(output).toContain('deploy');
		expect(output).toContain('Deploy the application to an environment');
		expect(output).toContain('--environment');
		// Not the root command list: the sibling command must be absent
		expect(output).not.toContain('status');
	});

	it('companion: --help renders root help listing deploy and status', async () => {
		const cli = makeMultiCommandCLI();
		await cli.run(['--help']);

		const output = getCapturedOutput();
		expect(output).toContain('COMMANDS');
		expect(output).toContain('deploy');
		expect(output).toContain('status');
	});
});
