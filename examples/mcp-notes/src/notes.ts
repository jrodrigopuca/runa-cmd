// What the CLI does: keep notes in a JSON file. It knows nothing about
// terminals or agents, so the same functions serve both.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface Note {
	id: number;
	text: string;
}

export function readNotes(file: string): Note[] {
	return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
}

export function addNote(file: string, text: string): Note {
	const notes = readNotes(file);
	const note = { id: (notes.at(-1)?.id ?? 0) + 1, text };
	writeFileSync(file, JSON.stringify([...notes, note]));
	return note;
}

export function clearNotes(file: string): number {
	const count = readNotes(file).length;
	writeFileSync(file, '[]');
	return count;
}
