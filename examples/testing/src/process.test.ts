// What testCLI() can't show: the program as it starts, in its own process.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const main = resolve('src/main.ts');
const ship = (args: string[], cwd = process.cwd()) =>
	spawnSync(process.execPath, [main, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, DEPLOY_TOKEN: 'secret-token' },
	});

test('starts as a program, and reads the real environment', () => {
	const result = ship(['deploy', 'api']);

	assert.equal(result.status, 0);
	assert.equal(result.stdout, 'Deployed https://staging.example.com/api with 1 replica\n');
});

// testCLI() hands the config values in: only a real run proves the file is found
test('reads the config file of the folder it runs in', () => {
	const folder = mkdtempSync(join(tmpdir(), 'ship-'));
	writeFileSync(join(folder, 'ship.config.json'), JSON.stringify({ deploy: { replicas: 3 } }));

	assert.match(ship(['deploy', 'api'], folder).stdout, /with 3 replicas/);
});

test('ends with the exit code a script sees', () => {
	assert.equal(ship(['deploy', 'api', '--target', 'production']).status, 3);
	assert.equal(ship(['nothing']).status, 127);
});
