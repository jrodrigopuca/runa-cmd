import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { testCLI } from '@runa-cmd/core/testing';
import { cli } from './cli.ts';

const env = () => ({ NOTES_FILE: join(mkdtempSync(join(tmpdir(), 'notes-')), 'notes.json') });

test('adds a note and lists it for a person', async () => {
	const vars = env();
	await testCLI(cli, ['add', 'Buy milk'], { env: vars });

	const result = await testCLI(cli, ['list'], { env: vars });
	assert.equal(result.stdout, '1. Buy milk\n');
});

test('gives the data with --json, as an agent gets it', async () => {
	const vars = env();
	await testCLI(cli, ['add', 'Buy milk'], { env: vars });

	const result = await testCLI(cli, ['list', '--json'], { env: vars });
	assert.deepEqual(JSON.parse(result.stdout), { notes: [{ id: 1, text: 'Buy milk' }] });
});

test('needs the file from whoever runs it', async () => {
	const result = await testCLI(cli, ['list'], { env: {} });
	assert.equal(result.code, 2);
	assert.match(result.stderr, /NOTES_FILE/);
});
