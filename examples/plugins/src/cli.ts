import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { readOnly } from './read-only.ts';
import { timingPlugin } from './timing.ts';

const tasks = ['Write the guide', 'Review it'];

const list = defineCommand({
	meta: { description: 'List the tasks' },
	run: () => tasks.map((task, i) => `${i + 1}. ${task}`).join('\n'),
});

const remove = defineCommand({
	meta: { description: 'Remove a task' },
	args: { number: z.number().int().min(1).describe('Which one, as list shows it') },
	// A real CLI would save the change; this one only says what it would remove
	run: ({ args }) => `Removed '${tasks[args.number - 1]}'`,
});

export const cli = defineCLI({
	meta: { name: 'todo', version: '1.0.0', description: 'Keep a list of tasks' },
	commands: { task: { list, remove } },
	// A global option, so the middleware reads it from the terminal or from env
	globalOptions: { readOnly: z.boolean().default(false).describe('Refuse commands that write') },
	globalMeta: { options: { readOnly: { env: 'READ_ONLY' } } },
	middleware: [readOnly(['task remove'])],
	plugins: [timingPlugin()],
});
