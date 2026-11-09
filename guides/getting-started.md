# Getting started

From an empty folder to a CLI you can test, install and publish. It takes about ten minutes.

You need Node 24 or later.

> **In a hurry?** `npm create @runa-cmd my-tool` creates the project this guide builds, named after yours. This guide explains every file it makes.

## 1. Create the project

```bash
mkdir greet && cd greet
npm init -y
npm pkg set type=module
npm install @runa-cmd/core zod
npm install -D typescript @types/node
```

Runa is ESM only, hence `type=module`. Zod defines your commands, so it's a dependency of your CLI.

Add a `tsconfig.json`. Node runs your TypeScript as it is while you develop, and these options keep your code to what it can run. `tsc` builds the version you ship.

<!-- file: examples/getting-started/tsconfig.json -->
```json
{
	"compilerOptions": {
		"target": "es2024",
		"module": "nodenext",
		"strict": true,
		"outDir": "dist",
		"rootDir": "src",
		"rewriteRelativeImportExtensions": true,
		"erasableSyntaxOnly": true,
		"verbatimModuleSyntax": true,
		"skipLibCheck": true,
		"types": ["node"]
	},
	"include": ["src"],
	"exclude": ["src/**/*.test.ts"]
}
```

`types` loads Node's types, so `import ... from 'node:fs'` compiles. Since TypeScript 6, they don't load on their own.

## 2. Define the CLI

Put the CLI in its own file, `src/cli.ts`, and export it. Starting it goes somewhere else: that's what lets you import it in a test without running it.

<!-- file: examples/getting-started/src/cli.ts -->
```ts
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const hello = defineCommand({
	meta: { description: 'Say hello to someone' },
	args: { name: z.string().describe('Who to greet') },
	options: { shout: z.boolean().default(false).describe('Use capital letters') },
	run: ({ args, options }) => {
		const text = `Hello, ${args.name}!`;
		return options.shout ? text.toUpperCase() : text;
	},
});

export const cli = defineCLI({
	meta: { name: 'greet', version: '1.0.0', description: 'Greet people' },
	commands: { hello },
});
```

- **The key is the name:** `hello` is what people type. A name of several words is written with dashes, as in `'add-tag'`.
- **`args` are positional,** in the order of their keys. **`options` are flags:** `shout` is `--shout`, and `darkColor` would be `--dark-color`.
- **What `run()` returns is printed:** a string as it is, anything else as JSON. To print it your way, add `format`, as the [core README](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/core#what-a-command-returns) shows.
- **Types come from the schema:** `args.name` is a `string`, and `options.shout` a `boolean`.

## 3. Start it

`src/main.ts` only starts the CLI. The first line lets your system run it as a program once it's installed.

<!-- file: examples/getting-started/src/main.ts -->
```ts
#!/usr/bin/env node
import { cli } from './cli.ts';

await cli.run();
```

Try it:

```bash
node src/main.ts hello Ana
# Hello, Ana!
node src/main.ts hello Ana --shout
# HELLO, ANA!
node src/main.ts --help
```

`--help` and `--version` work without configuring anything. A mistyped command or flag exits with an error code and says how to fix it.

## 4. Test it

`testCLI()` runs your CLI through its real lifecycle, without ending your test process, and gives you what it printed, its exit code and what `run()` returned. `node:test` comes with Node:

<!-- file: examples/getting-started/src/cli.test.ts -->
```ts
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
```

```bash
node --test src/cli.test.ts
```

It works with Vitest or Jest too, and several tests can run at the same time. The [core README](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/core#testing-testcli) has the rest: environment variables, config values, and a trace of what happened.

## 5. Ship it

**Build before you install or publish.** Node runs TypeScript from your project, but not from inside `node_modules`: an installed package in `.ts` fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. `tsc` writes JavaScript to `dist/`, and `rewriteRelativeImportExtensions` turns `./cli.ts` into `./cli.js` there.

Tell npm which file is the program, and what to ship:

```bash
npm pkg set bin.greet=dist/main.js
npm pkg set 'files[0]=dist'
npm pkg set scripts.build=tsc
npm run build
```

Now install it on your machine, or publish it:

```bash
npm install -g .
greet hello Ana

npm publish   # Run npm run build first, every time
```

## Next

- **Behavior around your commands:** [Middleware and plugins](./plugins.md) wraps commands, reacts to each step of a run, and adds options.
- **More on tests:** [Testing a CLI](./testing.md) covers env and config, errors, `trace`, and what needs a real process.

- **Your commands as an agent's tools:** [Your CLI as an agent's tools](./mcp.md) adds `--mcp`, and covers what changes when a model calls them.

- **Coming from another tool?** [Runa and the alternatives](./runa-compared.md) builds this same CLI with commander, yargs, citty and cac, and marks what changes.
- **Moving a commander CLI?** [Migrating from commander](./migrate-from-commander.md) translates it piece by piece, and lists what changes for the people using it.

- **Help with colors and layout:** [`@runa-cmd/help`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/help).
- **Shell completions:** [`@runa-cmd/completions`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/completions).
- **Your CLI as tools for an AI agent:** [`@runa-cmd/mcp`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/mcp). The same commands, with `--mcp`.
- **Several commands, groups, config files, hooks and middleware:** the [core README](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/core).
- **What a new version can break:** [`VERSIONING.md`](../VERSIONING.md).
