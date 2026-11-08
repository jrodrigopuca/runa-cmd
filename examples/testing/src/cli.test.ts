import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRunaError } from '@runa-cmd/core';
import { testCLI } from '@runa-cmd/core/testing';
import { audit, cli, deploy } from './cli.ts';

// The operator's token, as the environment would give it
const env = { DEPLOY_TOKEN: 'secret-token' };

test('returns the data, and shows it to a person with format', async () => {
	const result = await testCLI(cli, ['deploy', 'api'], { env });

	assert.equal(result.code, 0);
	assert.deepEqual(result.result, { url: 'https://staging.example.com/api', replicas: 1 });
	assert.equal(result.stdout, 'Deployed https://staging.example.com/api with 1 replica\n');
});

test('reads the token from env, and names it when it is missing', async () => {
	const result = await testCLI(cli, ['deploy', 'api'], { env: {} });

	assert.equal(result.code, 2);
	assert.match(result.stderr, /DEPLOY_TOKEN/);
});

test('takes values from the config file, and the terminal wins over it', async () => {
	const config = { deploy: { replicas: 3 } };

	const fromFile = await testCLI(cli, ['deploy', 'api'], { env, config });
	assert.deepEqual(fromFile.result, { url: 'https://staging.example.com/api', replicas: 3 });

	const typed = await testCLI(cli, ['deploy', 'api', '--replicas', '2'], { env, config });
	assert.deepEqual(typed.result, { url: 'https://staging.example.com/api', replicas: 2 });
});

test('says where each value came from, and never shows one from env', async () => {
	const { trace } = await testCLI(cli, ['deploy', 'api'], {
		env,
		config: { deploy: { replicas: 3 } },
	});
	const source = (name: string) =>
		trace.find((event) => event.step === 'option' && event.name === name);

	assert.equal(source('replicas')?.source, 'config');
	assert.equal(source('target')?.source, 'default');
	assert.equal(source('token')?.source, 'env');
	assert.ok(!JSON.stringify(trace).includes('secret-token'));
});

test('tells errors apart by their code, not by their message', async () => {
	const result = await testCLI(cli, ['deploy', 'api', '--target', 'production'], { env });

	assert.equal(result.code, 3);
	assert.ok(isRunaError(result.error, 'TOO_FEW_REPLICAS'));
});

test('runs a single command with the middleware it will have', async () => {
	const result = await testCLI(deploy, ['api'], { env, middleware: [audit] });

	assert.equal(result.code, 0);
	assert.match(result.stderr, /^audit: deploy\n/);
});
