// A real multi-command CLI for routing, --version and the -- separator.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const print = ({ args, options, rest }) => console.log(JSON.stringify({ args, options, rest }));

await defineCLI({
	meta: { name: 'routing', version: process.env.CLI_VERSION },
	commands: {
		status: defineCommand({ meta: { name: 'status', description: 'status' }, run: print }),
		// Declares its own --version, which must win over the built-in one.
		deploy: defineCommand({
			meta: { name: 'deploy', description: 'deploy' },
			options: { version: z.string().optional() },
			run: print,
		}),
		release: defineCommand({
			meta: {
				name: 'release',
				description: 'release',
				options: { tag: { alias: ['--version'] } },
			},
			options: { tag: z.string().optional() },
			run: print,
		}),
		exec: defineCommand({
			meta: { name: 'exec', description: 'exec' },
			args: { target: z.string().optional() },
			run: print,
		}),
		run: defineCommand({ meta: { name: 'run', description: 'run' }, run: print }),
		copy: defineCommand({
			meta: { name: 'copy', description: 'copy' },
			args: { from: z.string(), to: z.string() },
			run: print,
		}),
		add: defineCommand({
			meta: { name: 'add', description: 'add' },
			args: { files: z.array(z.string()) },
			run: print,
		}),
	},
}).run();
