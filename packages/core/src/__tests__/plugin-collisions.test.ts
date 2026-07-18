/**
 * Option collision detection — beta-readiness tasks 3.5/3.6 (design D9, spec 2.4).
 *
 * Unit: direct validateOptionCollisions() calls with synthetic trees.
 * Integration: full cli.run() lifecycle — the check fires after plugin setup,
 * before any parsing or command execution, as RunaError OPTION_COLLISION exit 1.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineCLI } from '../cli.js';
import { defineCommand } from '../command.js';
import { RunaError } from '../errors.js';
import { definePlugin, STATIC_GLOBAL_OPTION_SOURCE, validateOptionCollisions } from '../plugin.js';
import type { CommandTree } from '../types.js';

// ─── Helpers ────────────────────────────────────────────────

function cmd(
	name: string,
	options: Record<string, z.ZodType> = {},
	optionMeta?: Record<string, { alias?: string[] }>,
) {
	return defineCommand({
		meta: { name, description: `${name} command`, options: optionMeta },
		options,
		run: () => {},
	});
}

function expectCollision(fn: () => void, ...fragments: string[]): void {
	let caught: unknown;
	try {
		fn();
	} catch (err) {
		caught = err;
	}
	expect(caught).toBeInstanceOf(RunaError);
	const runaErr = caught as RunaError;
	expect(runaErr.code).toBe('OPTION_COLLISION');
	expect(runaErr.exitCode).toBe(1);
	for (const fragment of fragments) {
		expect(runaErr.message).toContain(fragment);
	}
}

// ─── Unit: validateOptionCollisions() ───────────────────────

describe('validateOptionCollisions (unit)', () => {
	it('throws when a plugin global name collides with a command option name', () => {
		const commands: CommandTree = { deploy: cmd('deploy', { verbose: z.boolean() }) };
		const sources = new Map([['verbose', ['@runa-cmd/help']]]);

		expectCollision(
			() => validateOptionCollisions(commands, { verbose: z.boolean() }, { options: {} }, sources),
			'--verbose',
			"plugin '@runa-cmd/help'",
			"command 'deploy'",
		);
	});

	it('throws on short-alias collision, citing the short flag', () => {
		const commands: CommandTree = {
			serve: cmd('serve', { host: z.string() }, { host: { alias: ['-h'] } }),
		};
		const sources = new Map([['help', ['@runa-cmd/help']]]);

		expectCollision(
			() =>
				validateOptionCollisions(
					commands,
					{ help: z.boolean() },
					{ options: { help: { alias: ['-h'] } } },
					sources,
				),
			"'-h'",
			'--help',
			'--host',
			"command 'serve'",
		);
	});

	it('throws when two plugins register the same global name, naming both', () => {
		const sources = new Map([['format', ['plugin-a', 'plugin-b']]]);

		expectCollision(
			() => validateOptionCollisions({}, { format: z.string() }, { options: {} }, sources),
			'--format',
			"plugin 'plugin-a'",
			"plugin 'plugin-b'",
		);
	});

	it('throws when a plugin re-registers a statically-declared global', () => {
		const sources = new Map([['verbose', [STATIC_GLOBAL_OPTION_SOURCE, 'noisy-plugin']]]);

		expectCollision(
			() => validateOptionCollisions({}, { verbose: z.boolean() }, { options: {} }, sources),
			'--verbose',
			'CLI config',
			"plugin 'noisy-plugin'",
		);
	});

	it('throws when two different globals claim the same short alias', () => {
		const sources = new Map([
			['help', ['@runa-cmd/help']],
			['host', ['other-plugin']],
		]);

		expectCollision(
			() =>
				validateOptionCollisions(
					{},
					{ help: z.boolean(), host: z.string() },
					{ options: { help: { alias: ['-h'] }, host: { alias: ['-h'] } } },
					sources,
				),
			"'-h'",
			'--help',
			'--host',
		);
	});

	it('throws for a collision in a nested subcommand (full-tree walk)', () => {
		const commands: CommandTree = {
			config: { set: cmd('set', { output: z.string() }) },
		};
		const sources = new Map([['output', ['formatter-plugin']]]);

		expectCollision(
			() => validateOptionCollisions(commands, { output: z.string() }, { options: {} }, sources),
			'--output',
			"plugin 'formatter-plugin'",
			"command 'config set'",
		);
	});

	it('throws when a global long alias collides with a command option name', () => {
		const commands: CommandTree = { paint: cmd('paint', { colour: z.string() }) };

		expectCollision(
			() =>
				validateOptionCollisions(
					commands,
					{ color: z.string() },
					{ options: { color: { alias: ['--colour'] } } },
				),
			'--color',
			'--colour',
			"command 'paint'",
			"'--colour'",
		);
	});

	it('attributes statically-declared globals to config.globalOptions when no sources map exists', () => {
		const commands: CommandTree = { deploy: cmd('deploy', { verbose: z.boolean() }) };

		expectCollision(
			() => validateOptionCollisions(commands, { verbose: z.boolean() }, { options: {} }),
			'--verbose',
			'config.globalOptions',
			"command 'deploy'",
		);
	});

	it('does not throw for disjoint option surfaces', () => {
		const commands: CommandTree = {
			deploy: cmd('deploy', { force: z.boolean() }, { force: { alias: ['-f'] } }),
			config: { set: cmd('set', { key: z.string() }) },
		};

		expect(() =>
			validateOptionCollisions(
				commands,
				{ help: z.boolean(), verbose: z.boolean() },
				{ options: { help: { alias: ['-h'] }, verbose: { alias: ['-V'] } } },
				new Map([
					['help', ['@runa-cmd/help']],
					['verbose', [STATIC_GLOBAL_OPTION_SOURCE]],
				]),
			),
		).not.toThrow();
	});

	it('does not throw when there are no global options at all', () => {
		const commands: CommandTree = { deploy: cmd('deploy', { verbose: z.boolean() }) };
		expect(() => validateOptionCollisions(commands, {}, { options: {} })).not.toThrow();
	});
});

// ─── Integration: full cli.run() lifecycle ──────────────────

describe('option collision detection (integration)', () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		exitSpy.mockRestore();
		errorSpy.mockRestore();
	});

	function stderrText(): string {
		return errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
	}

	it('plugin global vs command option: exits 1 before the command executes', async () => {
		const runSpy = vi.fn();
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy' },
			options: { verbose: z.boolean().default(false) },
			run: runSpy,
		});

		const verbosePlugin = definePlugin({
			meta: { name: 'verbose-plugin' },
			capabilities: { addGlobalOptions: true },
			setup(api) {
				api.addGlobalOption('verbose', z.boolean().default(false));
			},
		});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { deploy },
			plugins: [verbosePlugin],
		});

		await cli.run(['deploy']);

		expect(runSpy).not.toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(stderrText()).toContain('--verbose');
		expect(stderrText()).toContain("plugin 'verbose-plugin'");
		expect(stderrText()).toContain("command 'deploy'");
	});

	it('two plugins registering the same global: exits 1 naming both plugins', async () => {
		const makeFormatPlugin = (name: string) =>
			definePlugin({
				meta: { name },
				capabilities: { addGlobalOptions: true },
				setup(api) {
					api.addGlobalOption('format', z.string().optional());
				},
			});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { hello: cmd('hello') },
			plugins: [makeFormatPlugin('plugin-a'), makeFormatPlugin('plugin-b')],
		});

		await cli.run(['hello']);

		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(stderrText()).toContain('--format');
		expect(stderrText()).toContain("plugin 'plugin-a'");
		expect(stderrText()).toContain("plugin 'plugin-b'");
	});

	it('nested subcommand collision is detected through cli.run()', async () => {
		const runSpy = vi.fn();
		const set = defineCommand({
			meta: { name: 'set', description: 'Set config' },
			options: { output: z.string().optional() },
			run: runSpy,
		});

		const outputPlugin = definePlugin({
			meta: { name: 'output-plugin' },
			capabilities: { addGlobalOptions: true },
			setup(api) {
				api.addGlobalOption('output', z.string().optional());
			},
		});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { config: { set } },
			plugins: [outputPlugin],
		});

		await cli.run(['config', 'set']);

		expect(runSpy).not.toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(stderrText()).toContain("command 'config set'");
	});

	it('clean configuration runs normally (help-style plugin + disjoint commands)', async () => {
		const runSpy = vi.fn();
		const deploy = defineCommand({
			meta: { name: 'deploy', description: 'Deploy', options: { force: { alias: ['-f'] } } },
			options: { force: z.boolean().default(false) },
			run: runSpy,
		});

		const helpLike = definePlugin({
			meta: { name: 'help-like' },
			capabilities: { addGlobalOptions: true },
			setup(api) {
				api.addGlobalOption('help', z.boolean().optional().default(false), {
					alias: ['-h'],
				});
			},
		});

		const cli = defineCLI({
			meta: { name: 'mycli' },
			commands: { deploy },
			plugins: [helpLike],
		});

		await cli.run(['deploy', '--force']);

		expect(runSpy).toHaveBeenCalledTimes(1);
		expect(exitSpy).not.toHaveBeenCalled();
	});
});
