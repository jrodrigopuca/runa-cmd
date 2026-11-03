import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testCLI } from '@runa-cmd/core/testing';
import { cli } from './cli.ts';

test('greets someone', async () => {
	const result = await testCLI(cli, ['hello', 'Ana']);
	assert.equal(result.code, 0);
	assert.equal(result.stdout, 'Hello, Ana!\n');
});

test('shouts with --shout', async () => {
	const result = await testCLI(cli, ['hello', 'Ana', '--shout']);
	assert.equal(result.stdout, 'HELLO, ANA!\n');
});

test('needs a name', async () => {
	const result = await testCLI(cli, ['hello']);
	assert.equal(result.code, 2);
	assert.match(result.stderr, /<name>/);
});
