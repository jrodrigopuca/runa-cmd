// A real CLI with no plugins, to see what help does from the first command.
import { defineCLI, defineCommand, definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const trace = definePlugin({
	meta: { name: 'trace', version: '1.0.0' },
	setup(api) {
		api.hook('cleanup', () => console.log('cleanup-ran'));
	},
});

const replacesHelp = (name) =>
	definePlugin({
		meta: { name, version: '1.0.0' },
		capabilities: { replaceHelp: true },
		setup(api) {
			api.replaceHelp((target) =>
				console.log(`custom help for ${target.name ?? target.meta.name}`),
			);
		},
	});

const plugins = [trace];
if (process.env.CUSTOM_HELP) plugins.push(replacesHelp('custom-a'));
if (process.env.TWO_HELPS) plugins.push(replacesHelp('custom-b'));

await defineCLI({
	meta: { name: 'app', version: '2.0.0', description: 'A sample app' },
	globalOptions: { profile: z.string().default('dev').describe('Profile to use') },
	plugins,
	commands: {
		serve: defineCommand({
			meta: {
				name: 'serve',
				description: 'Start the server',
				options: { host: { alias: ['-h'] } },
			},
			options: { host: z.string().default('localhost').describe('Host to bind') },
			run: ({ options }) => console.log(`serving on ${options.host}`),
		}),
		show: defineCommand({
			meta: { name: 'show', description: 'Show a value' },
			args: { key: z.string().describe('Key to read') },
			options: { help: z.boolean().default(false).describe('Explain the value') },
			run: ({ options }) => console.log(`help is ${options.help}`),
		}),
		db: {
			migrate: defineCommand({
				meta: { name: 'migrate', description: 'Run migrations' },
				args: { target: z.string().describe('Version to reach') },
				run() {},
			}),
		},
	},
}).run();
