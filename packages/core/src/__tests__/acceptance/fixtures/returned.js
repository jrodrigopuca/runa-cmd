// A real CLI whose commands return values, to see what reaches the terminal.
import { defineCLI, defineCommand, definePlugin, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const command = (name, config) =>
	defineCommand({ meta: { name, description: `The ${name} command` }, ...config });

const status = () => ({ running: true, port: 11435 });

const order = definePlugin({
	meta: { name: 'order', version: '1.0.0' },
	setup(api) {
		if (!process.env.SHOW_ORDER) return;
		api.hook('afterRun', () => console.log('afterRun'));
	},
});

const commands = {
	text: command('text', { run: () => 'hello' }),
	line: command('line', { run: () => 'already a line\n' }),
	object: command('object', { run: status }),
	list: command('list', { run: () => [1, 2] }),
	nothing: command('nothing', { run: () => {} }),
	zero: command('zero', { run: () => 0 }),
	empty: command('empty', { run: () => '' }),
	asyncly: command('asyncly', { run: async () => ({ later: true }) }),
	schema: command('schema', { output: z.object({ ok: z.boolean() }), run: () => ({ ok: true }) }),
	invalid: command('invalid', { output: z.object({ ok: z.boolean() }), run: () => ({ ok: 'no' }) }),
	printer: command('printer', { run: () => console.log('printed by hand') }),
	both: command('both', {
		run() {
			console.log('printed by hand');
			return 'returned';
		},
	}),
	status: command('status', {
		run: status,
		format: (result) => `Proxy ${result.running ? 'on' : 'off'}, port ${result.port}`,
	}),
	forgetful: command('forgetful', { run: () => {}, format: () => 'never' }),
	broken: command('broken', {
		run: status,
		format() {
			throw new Error('format failed');
		},
	}),
	nested: { status: command('status', { run: status, format: () => 'nested' }) },
};

if (process.env.ROOT) {
	await runCLI(commands.status, { plugins: [order] });
} else {
	await defineCLI({
		meta: { name: 'returned', version: '1.0.0' },
		commands,
		plugins: [order],
		...(process.env.GLOBAL_JSON ? { globalOptions: { json: z.boolean().default(false) } } : {}),
	}).run();
}
