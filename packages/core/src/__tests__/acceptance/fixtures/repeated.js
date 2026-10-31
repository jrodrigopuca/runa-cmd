// A real CLI whose options repeat, to see what each source delivers.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const show = ({ options, globalOptions }) =>
	console.log(JSON.stringify({ options, globalOptions }));

await defineCLI({
	meta: { name: 'repeated', version: '1.0.0' },
	globalOptions: { include: z.array(z.string()).optional() },
	globalMeta: { options: { include: { alias: ['-I'] } } },
	config: process.env.CONFIG_DIR
		? { name: 'repeated', searchPaths: [process.env.CONFIG_DIR] }
		: undefined,
	commands: {
		tag: defineCommand({
			meta: {
				name: 'tag',
				description: 'Tag something',
				options: {
					tag: { alias: ['-t', '--label'], env: 'TAGS' },
					port: { env: 'PORTS' },
				},
			},
			options: {
				tag: z.array(z.string()).optional().describe('Tags to add'),
				port: z.array(z.number()).optional().describe('Ports to open'),
				level: z.array(z.enum(['low', 'high'])).optional(),
				name: z.string().optional(),
			},
			run: show,
		}),
		required: defineCommand({
			meta: { name: 'required', description: 'Needs a tag' },
			options: { tag: z.array(z.string()).min(1) },
			run: show,
		}),
		defaults: defineCommand({
			meta: { name: 'defaults', description: 'Has default tags' },
			options: { tag: z.array(z.string()).default(['base']) },
			run: show,
		}),
	},
}).run();
