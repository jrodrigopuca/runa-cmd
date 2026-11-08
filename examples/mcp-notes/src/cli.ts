import { CommandError, defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { mcpPlugin } from '@runa-cmd/mcp';
import { addNote, clearNotes, readNotes } from './notes.ts';

// Where the notes are kept is up to whoever runs the CLI: with env, it stays
// out of every tool's schema, so a model can't point it somewhere else
const fileOption = { file: z.string().describe('File where the notes are kept') };
const fileMeta = { file: { env: 'NOTES_FILE' } };

const note = z.object({ id: z.number(), text: z.string() });

const list = defineCommand({
	meta: { description: 'List the notes', options: fileMeta },
	options: fileOption,
	output: z.object({ notes: z.array(note) }),
	run: ({ options }) => ({ notes: readNotes(options.file) }),
	format: ({ notes }) => notes.map((n) => `${n.id}. ${n.text}`).join('\n') || 'No notes yet.',
});

const add = defineCommand({
	meta: { description: 'Add a note', options: fileMeta },
	args: { text: z.string().min(1).describe('What the note says') },
	options: fileOption,
	output: note,
	run: ({ args, options }) => addNote(options.file, args.text),
	format: (added) => `Added note ${added.id}.`,
});

const clear = defineCommand({
	meta: { description: 'Delete every note', options: fileMeta },
	options: fileOption,
	output: z.object({ deleted: z.number() }),
	run({ options }) {
		// A model reads this text, and nothing else, to decide what to do next
		if (readNotes(options.file).length === 0) {
			throw new CommandError('There are no notes to delete. Nothing changed.');
		}
		return { deleted: clearNotes(options.file) };
	},
	format: ({ deleted }) => `Deleted ${deleted} notes.`,
});

// Never ends on its own: it's for a person at a terminal, not for a tool call
const watch = defineCommand({
	meta: { description: 'Show how many notes there are, until stopped', options: fileMeta },
	options: fileOption,
	async run({ options, signal }) {
		const timer = setInterval(() => console.error(`${readNotes(options.file).length} notes`), 1000);
		await new Promise((resolve) => signal.addEventListener('abort', resolve));
		clearInterval(timer);
	},
});

export const cli = defineCLI({
	meta: { name: 'notes', version: '1.0.0', description: 'Keep short notes' },
	commands: { list, add, clear, watch },
	plugins: [
		mcpPlugin({
			exclude: ['watch'],
			instructions: 'Call list before add or clear, to see what is there.',
			tools: {
				list: { annotations: { readOnlyHint: true } },
				clear: {
					description: 'Delete every note. It cannot be undone: ask before calling it.',
					annotations: { destructiveHint: true },
				},
			},
		}),
	],
});
