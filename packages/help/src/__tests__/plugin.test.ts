/**
 * Unit tests for helpPlugin (plugin.ts)
 *
 * Core decides when help runs and what it's about: that lives in core's
 * acceptance tests. What's left here is how the plugin shows a target.
 */

import type {
	CLISchema,
	CommandSchema,
	HelpHandler,
	HelpTarget,
	PluginConfig,
} from '@runa-cmd/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRenderContext } from '../ansi/detect.js';
import { helpPlugin } from '../plugin.js';

// ─── Helpers ────────────────────────────────────────────────

const cli: CLISchema = {
	meta: { name: 'test-cli', version: '1.0.0' },
	commands: [],
	globalOptions: [],
};

const serve: CommandSchema = {
	name: 'serve',
	description: 'Start dev server',
	fullPath: ['serve'],
	args: [],
	options: [
		{
			name: 'port',
			flag: 'port',
			description: 'Port number',
			type: 'number',
			required: false,
			defaultValue: 3000,
		},
	],
	hasOutput: false,
};

/** The way the plugin shows help, called the way core calls it for --help. */
function showOf(plugin: PluginConfig) {
	let show: HelpHandler | undefined;
	plugin.setup({
		replaceHelp: (handler: HelpHandler) => {
			show = handler;
		},
	} as never);
	if (!show) throw new Error('The plugin did not replace the help');
	const handler = show;
	return (target: HelpTarget, output: NodeJS.WritableStream = process.stdout) =>
		handler(target, output);
}

// ─── Setup / Teardown ───────────────────────────────────────

let exitSpy: ReturnType<typeof vi.spyOn>;
let writeSpy: ReturnType<typeof vi.spyOn>;

const written = () => writeSpy.mock.calls[0]?.[0] as string;

beforeEach(() => {
	resetRenderContext();
	exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
	exitSpy.mockRestore();
	writeSpy.mockRestore();
});

// ─── Plugin Structure ───────────────────────────────────────

describe('helpPlugin — structure', () => {
	it('declares what it does', () => {
		const plugin = helpPlugin();
		expect(plugin.meta.name).toBe('@runa-cmd/help');
		expect(plugin.capabilities).toEqual({ replaceHelp: true });
	});
});

// ─── Showing a target ───────────────────────────────────────

describe('helpPlugin — showing help', () => {
	it('renders the whole CLI', () => {
		showOf(helpPlugin())(cli);
		expect(writeSpy).toHaveBeenCalledTimes(1);
		expect(written()).toContain('test-cli');
	});

	it('renders a command', () => {
		showOf(helpPlugin())(serve);
		expect(written()).toContain('serve');
		expect(written()).toContain('Start dev server');
	});

	it('writes where core says', () => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		showOf(helpPlugin())(cli, process.stderr);

		expect(stderr).toHaveBeenCalledTimes(1);
		expect(writeSpy).not.toHaveBeenCalled();
		stderr.mockRestore();
	});

	it('leaves the process to core by default', () => {
		showOf(helpPlugin())(cli);
		expect(exitSpy).not.toHaveBeenCalled();
	});
});

// ─── exitOnHelp, removed ────────────────────────────────────

// It brought back the process.exit(0) of 0.1.0, which skips cleanup (T-237)
describe('helpPlugin — exitOnHelp was removed', () => {
	const removed = { exitOnHelp: true } as Parameters<typeof helpPlugin>[0];

	it('is not an option anymore', () => {
		// @ts-expect-error exitOnHelp is no longer in HelpPluginOptions
		const options: Parameters<typeof helpPlugin>[0] = { exitOnHelp: true };
		expect(options).toBeDefined();
	});

	it('says at startup that it was removed, without stopping the CLI', () => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		showOf(helpPlugin(removed))(cli);

		const warned = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
		expect(warned).toContain('helpPlugin: exitOnHelp was removed');
		expect(writeSpy).toHaveBeenCalledTimes(1);
		expect(exitSpy).not.toHaveBeenCalled();
		stderr.mockRestore();
	});

	it('says nothing when it is not passed', () => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		showOf(helpPlugin())(cli);
		expect(stderr).not.toHaveBeenCalled();
		stderr.mockRestore();
	});
});

// ─── Custom Render Function ─────────────────────────────────

describe('helpPlugin — custom render', () => {
	it('uses a custom render function, with the target and the theme', () => {
		const render = vi.fn().mockReturnValue('CUSTOM HELP OUTPUT');
		showOf(helpPlugin({ render }))(serve);

		expect(render).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: serve,
				theme: expect.any(Object),
				colorDepth: expect.any(String),
				termWidth: expect.any(Number),
			}),
		);
		expect(written()).toContain('CUSTOM HELP OUTPUT');
	});
});

// ─── Custom Theme ───────────────────────────────────────────

describe('helpPlugin — custom theme', () => {
	it('resolves the theme before rendering', () => {
		const render = vi.fn().mockReturnValue('themed');
		showOf(helpPlugin({ theme: { primary: '#00FF00' }, render }))(cli);
		expect(render.mock.calls[0]?.[0].theme).toBeDefined();
	});
});
