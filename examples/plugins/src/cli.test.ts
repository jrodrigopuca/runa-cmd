import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRunaError } from '@runa-cmd/core';
import { testCLI } from '@runa-cmd/core/testing';
import { cli } from './cli.ts';

test('the middleware lets a command through', async () => {
	const result = await testCLI(cli, ['task', 'list']);
	assert.equal(result.code, 0);
	assert.equal(result.stdout, '1. Write the guide\n2. Review it\n');
});

test('the middleware lets a command that writes through when read-only is off', async () => {
	const result = await testCLI(cli, ['task', 'remove', '2']);
	assert.equal(result.code, 0);
	assert.equal(result.stdout, "Removed 'Review it'\n");
});

test('the middleware stops a command that writes, and says why', async () => {
	const result = await testCLI(cli, ['task', 'remove', '1'], { env: { READ_ONLY: '1' } });

	assert.equal(result.code, 3);
	assert.ok(isRunaError(result.error, 'READ_ONLY'));
	assert.match(result.stderr, /'task remove' changes data/);
});

test('the middleware reads the same option from the terminal', async () => {
	const result = await testCLI(cli, ['task', 'remove', '1', '--read-only']);
	assert.equal(result.code, 3);
});

test('the plugin adds --timing, and says how long it took', async () => {
	const result = await testCLI(cli, ['task', 'list', '--timing']);
	assert.match(result.stderr, /^task list took \d+ ms\n$/);
});

test('the plugin says nothing without --timing', async () => {
	const result = await testCLI(cli, ['task', 'list']);
	assert.equal(result.stderr, '');
});
