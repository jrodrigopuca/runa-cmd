import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { testCLI } from '@runa-cmd/core/testing';
import { renderBadge } from './badge.ts';
import { badge } from './cli.ts';

const flat = { style: 'flat', textColor: '#ffffff', uppercase: false } as const;

test('prints the badge', async () => {
	const result = await testCLI(badge, ['beta']);
	assert.equal(result.code, 0);
	assert.equal(result.stdout, `${renderBadge('beta', flat)}\n`);
});

test('reads kebab-case flags and short aliases', async () => {
	const result = await testCLI(badge, ['beta', '-s', 'round', '--text-color', '#000000']);
	assert.equal(
		result.stdout,
		`${renderBadge('beta', { ...flat, style: 'round', textColor: '#000000' })}\n`,
	);
});

test('writes to a file with -o', async () => {
	const file = join(mkdtempSync(join(tmpdir(), 'badge-')), 'beta.svg');
	const result = await testCLI(badge, ['beta', '-o', file]);
	assert.equal(result.stdout, `Saved to ${file}\n`);
	assert.equal(readFileSync(file, 'utf8'), renderBadge('beta', flat));
});

test('a mistake in the call is exit 2', async () => {
	for (const argv of [[], ['beta', '--style', 'square'], ['beta', '--text-color', 'red']]) {
		const result = await testCLI(badge, argv);
		assert.equal(result.code, 2, argv.join(' '));
	}
});

test('a file it cannot write is exit 1, with the reason', async () => {
	const result = await testCLI(badge, ['beta', '-o', join(tmpdir(), 'missing-dir', 'beta.svg')]);
	assert.equal(result.code, 1);
	assert.match(result.stderr, /^Cannot write /);
});
