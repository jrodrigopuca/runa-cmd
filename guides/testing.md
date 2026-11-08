# Testing a CLI

How to test what your commands do, the values they read and the errors they give, with `testCLI()`, and when you need a real process instead.

It follows `ship`, a CLI with one command, `deploy`, that reads a token from the environment and its defaults from a config file. The code is [`examples/testing`](https://github.com/jrodrigopuca/runa-cmd/tree/main/examples/testing), and its tests run in CI.

It assumes the layout from [Getting started](./getting-started.md): `src/cli.ts` exports the CLI without starting it, so a test can import it, and `src/main.ts` starts it.

## The CLI

<!-- file: examples/testing/src/cli.ts -->
```ts
import { CommandError, defineCLI, defineCommand, defineMiddleware } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

export const deploy = defineCommand({
	meta: {
		name: 'deploy',
		description: 'Deploy a service',
		options: { token: { env: 'DEPLOY_TOKEN' } },
	},
	args: { service: z.string().describe('Service to deploy') },
	options: {
		target: z.enum(['staging', 'production']).default('staging').describe('Where to deploy'),
		replicas: z.number().int().min(1).default(1).describe('How many copies to run'),
		token: z.string().describe('API token'),
	},
	output: z.object({ url: z.string(), replicas: z.number() }),
	run({ args, options }) {
		if (options.target === 'production' && options.replicas < 2) {
			throw new CommandError('Production needs at least 2 replicas.', {
				code: 'TOO_FEW_REPLICAS',
				exitCode: 3,
			});
		}
		return {
			url: `https://${options.target}.example.com/${args.service}`,
			replicas: options.replicas,
		};
	},
	format: ({ url, replicas }) =>
		`Deployed ${url} with ${replicas} replica${replicas === 1 ? '' : 's'}`,
});

/** Writes each command that runs to stderr, as an audit log would */
export const audit = defineMiddleware(async ({ command, next }) => {
	console.error(`audit: ${command.path.join(' ')}`);
	await next();
});

export const cli = defineCLI({
	meta: { name: 'ship', version: '1.0.0', description: 'Deploy services' },
	commands: { deploy },
	middleware: [audit],
	config: { name: 'ship' },
});
```

## What `testCLI()` gives you

`testCLI(cli, argv, options)` runs the CLI through its real lifecycle, in the same process, and returns what happened instead of ending the process:

| Field | What it is |
|---|---|
| `code` | The exit code the process would end with |
| `stdout`, `stderr` | What it printed |
| `result` | What `run()` returned, before `format` |
| `error` | The original error, with its class, `code` and cause |
| `trace` | What happened, in order: where each value came from, the hooks that ran, what was written |

It doesn't read the real environment or config files: you hand them in, with `env` and `config`. That keeps a test from depending on the machine it runs on.

These are the tests of `ship`, one per thing worth checking:

<!-- file: examples/testing/src/cli.test.ts -->
```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
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
	assert.equal((result.error as { code?: string }).code, 'TOO_FEW_REPLICAS');
});

test('runs a single command with the middleware it will have', async () => {
	const result = await testCLI(deploy, ['api'], { env, middleware: [audit] });

	assert.equal(result.code, 0);
	assert.match(result.stderr, /^audit: deploy\n/);
});
```

What each one shows:

- **Test the data, then the text.** `result` is what an agent gets through MCP, and `stdout` is what a person reads. Checking both keeps `run()` and `format` honest on their own.
- **Hand in the environment.** `env: {}` is a machine with nothing set, so the test of a missing token doesn't depend on yours. The error names the variable, which is what whoever runs the CLI needs.
- **Hand in the config file's contents.** `config` is what the file would hold, by command, as in the file itself. A value typed at the terminal still wins over it. If the CLI doesn't declare `config` in `defineCLI`, the real program reads no file, so `testCLI()` fails and tells you, instead of passing.
- **Check where a value came from with `trace`.** When a value isn't the one you expected, `trace` tells you whether it came from the terminal, env, config or a default. A value from env never appears, because it can be a secret. The shape of `trace` isn't part of the [versioning contract](https://github.com/jrodrigopuca/runa-cmd/blob/main/VERSIONING.md), so use it to find out why, and assert on it sparingly.
- **Tell errors apart by `code`.** The text of an error can change in any release; its `code` and exit code can't. Assert on those, and on the message only where the message is the point, as with the variable name above.
- **Test a command alone.** `testCLI()` takes a single command too, with the `plugins`, `middleware`, `globalOptions` and `globalMeta` it will run under.

`testCLI()` works with any test runner. These use `node:test`, so the project needs nothing else; with Vitest, swap the imports, and `it.concurrent` works too, because each run keeps its own output.

## What needs a real process

`testCLI()` runs your CLI as a function. A few things only exist when it runs as a program:

<!-- file: examples/testing/src/process.test.ts -->
```ts
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
```

Use a real process for:

- **That `main.ts` starts the CLI.** `testCLI()` imports `cli.ts`, so it never runs `main.ts`.
- **That the config file is found.** `testCLI()` hands in what the file holds: only a real run proves that the CLI finds it where people put it, such as the folder it runs in.
- **Signals.** Ctrl+C and `SIGTERM` go to a process: to check how your command stops, send them to one.
- **The built program.** Before you publish, run `dist/main.js` once: that's what gets installed.
- **What `testCLI()` can't capture:** a command that reads `process.env` by itself sees the real one, and a child process or a write straight to a file descriptor isn't captured.

Keep these few: a process takes a moment to start, and `testCLI()` covers everything else.

## Testing it as an agent's tools

To check what an agent is offered, start `--mcp` and talk to it with an MCP client, as [Your CLI as an agent's tools](./mcp.md#8-test-it) shows.
