// A real CLI with commands that share option names, to see where a value lands.
import { defineCLI, defineCommand, definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const show = ({ command, options, globalOptions }) =>
	console.log(JSON.stringify({ command: command.name, options, globalOptions }));

const verbosity = definePlugin({
	meta: { name: 'verbosity', version: '1.0.0' },
	capabilities: { addGlobalOptions: true },
	setup(api) {
		api.addGlobalOption('verbose', z.boolean().default(false));
		api.addGlobalOption('dangerous', z.boolean().default(false), { configurable: false });
	},
});

const add = defineCommand({
	meta: { name: 'add', description: 'Add a note' },
	options: { priority: z.string().default('low') },
	run: show,
});
const list = defineCommand({
	meta: { name: 'list', description: 'List notes' },
	options: { priority: z.array(z.string()).default([]) },
	run: show,
});
const clear = defineCommand({
	meta: { name: 'clear', description: 'Delete everything' },
	options: { force: z.boolean().default(false) },
	run: show,
});
const wipe = defineCommand({
	meta: {
		name: 'wipe',
		description: 'Delete without asking',
		options: { force: { configurable: false } },
	},
	options: { force: z.boolean().default(false) },
	run: show,
});
const tagAdd = defineCommand({
	meta: { name: 'add', description: 'Add a tag' },
	options: { priority: z.string().default('none') },
	run: show,
});

const collision = process.env.COLLISION ? { tag: z.string().optional() } : {};

await defineCLI({
	meta: { name: 'notes', version: '1.0.0' },
	globalOptions: {
		store: z.string().default('notes.json'),
		limit: z.number().default(10),
		legacy: z.string().optional(),
		...collision,
	},
	globalMeta: {
		options: {
			store: { env: 'NOTES_STORE' },
			legacy: { deprecated: 'Use --store.' },
		},
	},
	config: process.env.CONFIG_DIR
		? { name: 'notes', searchPaths: [process.env.CONFIG_DIR] }
		: undefined,
	plugins: [verbosity],
	commands: { add, list, clear, wipe, tag: { add: tagAdd } },
}).run();
