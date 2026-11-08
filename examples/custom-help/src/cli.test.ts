import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testCLI } from '@runa-cmd/core/testing';
import { cli } from './cli.ts';

test('the help of the CLI is the custom one: a box, and a table of commands', async () => {
	const { code, stdout } = await testCLI(cli, ['--help']);

	assert.equal(code, 0);
	assert.match(stdout, /╭/);
	assert.match(stdout, /tool v1\.0\.0/);
	assert.match(stdout, /Command\s+Description/);
	assert.match(stdout, /deploy\s+Deploy a service/);
});

test('the help of a command falls back to the default renderer', async () => {
	const { code, stdout } = await testCLI(cli, ['deploy', '--help']);

	assert.equal(code, 0);
	assert.match(stdout, /USAGE/);
	assert.match(stdout, /--env/);
	assert.doesNotMatch(stdout, /╭/);
});
