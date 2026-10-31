// Run by `node --test`: its report goes through the stdout testCLI() captures.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CommandError, defineCLI, defineCommand } from '@runa-cmd/core';
import { testCLI } from '@runa-cmd/core/testing';

const cli = defineCLI({
	meta: { name: 'demo', version: '1.0.0' },
	commands: {
		ok: defineCommand({
			meta: { name: 'ok', description: 'ok' },
			run: () => console.log('fine'),
		}),
		fail: defineCommand({
			meta: { name: 'fail', description: 'fail' },
			run() {
				throw new CommandError('broken', { exitCode: 3 });
			},
		}),
	},
});

describe('inside one file', { concurrency: 20 }, () => {
	for (let index = 0; index < 20; index++) {
		it(`passes ${index}`, async () => {
			assert.equal((await testCLI(cli, ['ok'])).stdout, 'fine\n');
		});
	}

	it('survives a failing command', async () => {
		assert.equal((await testCLI(cli, ['fail'])).code, 3);
	});

	it('fails on purpose: the runner has to report it', async () => {
		assert.equal((await testCLI(cli, ['ok'])).code, 99);
	});
});
