// A real CLI whose positionals aren't strings.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const show = ({ args }) => console.log(JSON.stringify(args));
const command = (name, args) => defineCommand({ meta: { description: name }, args, run: show });

await defineCLI({
	meta: { name: 'positionals', version: '1.0.0' },
	commands: {
		number: command('number', { id: z.number() }),
		positive: command('positive', { id: z.number().positive() }),
		flag: command('flag', { on: z.boolean() }),
		optional: command('optional', { id: z.number().optional() }),
		fallback: command('fallback', { id: z.number().default(7) }),
		list: command('list', { ids: z.array(z.number()) }),
		mixed: command('mixed', { name: z.string(), ids: z.array(z.number()) }),
		text: command('text', { value: z.string() }),
		choice: command('choice', { level: z.enum(['low', 'high']) }),
	},
}).run();
