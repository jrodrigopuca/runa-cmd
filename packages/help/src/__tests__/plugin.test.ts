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

// ─── exitOnHelp Opt-In ──────────────────────────────────────

describe('helpPlugin — exitOnHelp', () => {
	it('exitOnHelp: true exits with 0 after rendering', () => {
		showOf(helpPlugin({ exitOnHelp: true }))(cli);
		expect(writeSpy).toHaveBeenCalledTimes(1);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('exitOnHelp: false behaves like the default', () => {
		showOf(helpPlugin({ exitOnHelp: false }))(cli);
		expect(exitSpy).not.toHaveBeenCalled();
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
