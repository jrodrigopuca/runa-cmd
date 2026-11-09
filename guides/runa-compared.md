# Starting a CLI: Runa and the alternatives

The same small CLI, built with Runa and with four other tools, step by step, so you can see what changes and what doesn't. It's `greet hello <name> --shout`, with a description and a version.

Where Runa does something differently, it's marked **Runa differs**. Where it costs you more, it says so too.

| Tool | Version measured |
|---|---|
| Runa | `@runa-cmd/core@0.2.0-beta.6`, with `zod@4.6.7` |
| commander | 15.1.0, and `@commander-js/extra-typings` 15.1.0 for its types |
| yargs | 18.2.0, with `@types/yargs` |
| citty | 0.2.2 |
| cac | 7.1.0 |
| oclif | 6.0.15, its generator and its test helpers |

Measured on 2026-11-08 with Node 26.11.1 on macOS, each CLI built with `tsc` and run from `dist/`, as people run it once installed. Startup is the mean of 30 runs with hyperfine. The numbers come from [the review before 1.0](../docs/research/2026-11-review-before-v1.md), which was asked to look for where Runa is worse, and an [earlier comparison](../docs/research/2026-11-ease-of-use.md). Runa's code below runs in this repo's CI. The other tools' code was run once, at these versions, and isn't kept up to date.

## At a glance

| | Runa | commander | yargs | citty | cac |
|---|---|---|---|---|---|
| Start a project | **One command** | By hand | By hand | By hand | By hand |
| Lines for this CLI | 17 | 13 | 21 | 17 | 12 |
| Packages to install | 2 | 1, or 2 for types | 2 | 1 | 1 |
| Size of `node_modules`, on disk | **9.0 MB, 8.3 of them Zod** | 236 KB | 924 KB | 56 KB | 56 KB |
| Startup, over Node with nothing loaded | +36 ms | +9 ms | +47 ms | +4 ms | +3 ms |
| Types from your definition | Yes | With `extra-typings` | Yes | Yes | No, `any` |
| Validation beyond the type | **Any Zod schema** | Allowed values, your own parser | Allowed values, your own checks | Allowed values | None |
| Exit code for a mistake | **2, or 127 for an unknown command** | 1 | 1 | 1, or **0** for an unknown flag | 1, or **0** for an unknown command |
| Tests without a subprocess | **Built in** | A helper you write | A helper you write | A helper you write, no exit code | A helper you write, no exit code |
| Shell completions | Bash, zsh and fish, from a script | None built in | **Built in, computed by the CLI on each TAB** | None built in | None built in |
| Its commands as an agent's tools | **`--mcp`** | No | No | No | No |

Node with nothing loaded starts in 104 ms. Runa adds 36 ms, and about 25 of them are importing Zod: measured alone, `import 'zod'` takes 25 ms, and all of `@runa-cmd/core` 32. Run as TypeScript, without building it, Runa adds 62 ms.

**Where the size comes from:** `@runa-cmd/core` takes 724 KB. The other 8.3 MB are Zod, which is what checks every value while your CLI runs (see [Types and validation](#types-and-validation)). Most of that is on disk and never loads: Zod ships its code twice, as ESM and as CommonJS, its types twice, its TypeScript sources, Zod 3 next to Zod 4, and 1.5 MB of error messages in other languages. What it costs when your CLI runs is in the startup row.

**With `--mcp`, it's much more:** `@runa-cmd/mcp` brings the official MCP SDK, and `node_modules` grows to 27.9 MB and 97 packages, counted with `npm ls --all`. A plain run doesn't load the SDK: only `--mcp` does. Each tool call runs your CLI again, as its own process.

## 1. Create the project

**Runa differs:** one command creates the project, ready to run, test and build.

```bash
npm create @runa-cmd my-tool
cd my-tool
npm install
node src/main.ts hello Ana
```

It asks nothing and installs nothing on its own. It works with pnpm, yarn and bun too, as `pnpm create @runa-cmd my-tool`.

**With commander, yargs, citty and cac** you set it up by hand. None of them has a generator: `create-commander` exists on npm, but at version `0.0.0`. The steps are the same for all four, because they come from Node and TypeScript, not from the tool:

```bash
mkdir my-tool && cd my-tool
npm init -y
npm pkg set type=module
npm install commander          # or yargs @types/yargs, citty, cac
npm install -D typescript @types/node
```

Then a `tsconfig.json`, a shebang in the entry file, and `bin` in `package.json`. [Getting started](./getting-started.md) shows each of these, and they're what Runa's generator writes for you. You can follow that guide by hand with Runa as well.

**oclif** also has a generator, `npx oclif generate my-tool`. It asks for the package name and other details, or nothing with `--yes`, and creates a project with one file per command. In the review it took 80 seconds and 183 MB, against 1.3 seconds for Runa's, and its template was older than oclif's current version.

## 2. Write the command

With Runa, the command is a definition: its arguments and options are Zod schemas, and `run` **returns** what to show.

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

<!-- file: examples/getting-started/src/main.ts -->
```ts
#!/usr/bin/env node
import { cli } from './cli.ts';

await cli.run();
```

With commander, the command is built with method calls, and the action **prints**:

```ts
import { Command } from 'commander';

const program = new Command();
program.name('greet').version('1.0.0').description('Greet people');

program
  .command('hello')
  .description('Say hello to someone')
  .argument('<name>', 'Who to greet')
  .option('--shout', 'Use capital letters', false)
  .action((name: string, options: { shout: boolean }) => {
    const text = `Hello, ${name}!`;
    console.log(options.shout ? text.toUpperCase() : text);
  });

await program.parseAsync();
```

<details>
<summary>The same CLI with yargs, citty and cac</summary>

yargs:

```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

await yargs(hideBin(process.argv))
  .scriptName('greet')
  .version('1.0.0')
  .usage('Greet people')
  .command(
    'hello <name>',
    'Say hello to someone',
    (y) =>
      y
        .positional('name', { type: 'string', demandOption: true, describe: 'Who to greet' })
        .option('shout', { type: 'boolean', default: false, describe: 'Use capital letters' }),
    (argv) => {
      const text = `Hello, ${argv.name}!`;
      console.log(argv.shout ? text.toUpperCase() : text);
    },
  )
  .demandCommand(1)
  .strict()
  .parse();
```

citty:

```ts
import { defineCommand, runMain } from 'citty';

const hello = defineCommand({
  meta: { name: 'hello', description: 'Say hello to someone' },
  args: {
    name: { type: 'positional', description: 'Who to greet', required: true },
    shout: { type: 'boolean', description: 'Use capital letters', default: false },
  },
  run({ args }) {
    const text = `Hello, ${args.name}!`;
    console.log(args.shout ? text.toUpperCase() : text);
  },
});

const main = defineCommand({
  meta: { name: 'greet', version: '1.0.0', description: 'Greet people' },
  subCommands: { hello },
});
await runMain(main);
```

cac:

```ts
import cac from 'cac';

const cli = cac('greet');

cli
  .command('hello <name>', 'Say hello to someone')
  .option('--shout', 'Use capital letters', { default: false })
  .action((name: string, options: { shout: boolean }) => {
    const text = `Hello, ${name}!`;
    console.log(options.shout ? text.toUpperCase() : text);
  });

cli.help();
cli.version('1.0.0');
cli.parse();
```

</details>

What changes:

- **Runa differs: `run` returns, it doesn't print.** Runa writes the result, so the same command works in a terminal, in a test and as an agent's tool. You can still print progress yourself, to stderr.
- **Types and validation.** Runa gets both from one schema. The next section compares them.
- **Runa costs more here:** two packages, Zod and Runa, and its own import, `@runa-cmd/core/zod`.
- **Runa differs: two files.** `cli.ts` exports the CLI without starting it, and `main.ts` starts it, so tests can import the CLI. The others put it all in one file, and to test it you split it the same way. The generator already does this.

## Types and validation

Two different things, which are easy to mix up:

- **Types** help you while you write: `args.name` is a `string`, and a mistake doesn't compile. They're erased when the code runs, so they weigh nothing.
- **Validation** checks what a person typed, while the CLI runs: that `--port` is a number between 1 and 65535, or that `--color` is a hex color. That's code, and it's in the package.

| | Runa | commander | yargs | citty | cac |
|---|---|---|---|---|---|
| Where types come from | The schema | The chain of calls, with `@commander-js/extra-typings`; without it, you write them | The chain of calls, with `@types/yargs` | The definition | You write them |
| Types of values | Any Zod type | Strings and booleans, unless you parse them | String, number, boolean, arrays | String, boolean | Strings, or `type: [Number]` |
| Allowed values | `z.enum()` | `choices()` | `choices` | `type: 'enum'` | No |
| Your own rule | `.regex()`, `.min()`, `.refine()` | `argParser()`, a function per option | `coerce` and `check()`, functions you write | No: check it in `run` | No: check it in the action |
| The rule shows in help | Allowed values and defaults, not ranges as `.min()` | Allowed values | Allowed values | Allowed values | No |
| The same rule for config files and agents | Yes | No | No | No | No |

The other tools' columns come from their type definitions, at the versions above. Whether types catch a mistake was run: four wrongly typed uses of the values, compiled with `tsc --strict`. Runa, yargs, citty, oclif and commander with `extra-typings` caught all four.

With yargs and citty, the types come from type-level code that maps your definition: `{ type: 'boolean' }` becomes `boolean`. That's why they're light. But a type can't check that a string is a hex color, so that rule ends up as code you write in the action, with your own error message and exit code.

With Runa, that rule is part of the schema, so it's checked once and used everywhere: before `run()` starts, with exit 2; in a config file, naming the file and the key; and in the JSON Schema an agent gets from `--mcp`. This is what Zod's size buys. [Migrating from commander](./migrate-from-commander.md) shows a color check moving from the action into the schema.

## 3. When people get it wrong

What the person running `greet` sees after a mistake, and the exit code a script gets:

| Mistake | Runa | commander | yargs | citty | cac |
|---|---|---|---|---|---|
| Missing argument | 2, names it | 1, names it | 1, help and error | 1, help | 1, **stack trace** |
| Unknown flag | 2 | 1 | 1 | **0, ignores it** | 1, **stack trace** |
| Misspelled command | 127, suggests one | 1, suggests one | 1, help | 1, help | **0, nothing** |
| No command | 2, help | 1, help | 1, help | 1, help | **0, nothing** |

**Runa differs:** a mistake in how the CLI was called is exit 2, and a command that doesn't exist is 127, as in shells. A script or an agent can tell "I called it wrong" from "it failed". oclif also uses 2. Exit 0 after a mistake, as citty and cac do in some cases, is the worst outcome: a script believes it worked.

## 4. Test it

**Runa differs:** `testCLI()` runs the CLI in the same process and gives you back what a person would see: the exit code, stdout and stderr.

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

The other four can be tested in the same process too, but you write the helper. These are the same three tests, run at the versions above, and each helper replaces `console.log` while the command runs, because the action prints:

| Tool | What the helper does | Lines | What a test gets |
|---|---|---|---|
| commander | `exitOverride()` so it throws instead of exiting, `configureOutput()` for its own messages | 23 | Output and exit code |
| yargs | `exitProcess(false)` and `fail()` to catch errors | 22 | Output, and an exit code you set |
| citty | `runCommand()`, which doesn't exit | 14 | Output and an exception, no exit code |
| cac | `parse(argv, { run: false })` and `runMatchedCommand()` | 16 | Output and an exception, no exit code |

Lines count only the helper, without blank lines. You also wrap the CLI in a function, so each test builds a fresh one.

This is commander's helper. You build a new program for each test, because commander keeps what it parsed:

```ts
async function run(argv: string[]) {
  const program = makeProgram();
  let stdout = '';
  let stderr = '';
  let code = 0;
  program.exitOverride();
  program.configureOutput({ writeOut: (s) => (stdout += s), writeErr: (s) => (stderr += s) });
  for (const cmd of program.commands) {
    cmd.exitOverride();
    cmd.configureOutput({ writeOut: (s) => (stdout += s), writeErr: (s) => (stderr += s) });
  }
  // console.log in the action isn't covered by configureOutput
  const log = console.log;
  console.log = (s: string) => (stdout += `${s}\n`);
  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    code = (error as { exitCode: number }).exitCode;
  } finally {
    console.log = log;
  }
  return { stdout, stderr, code };
}
```

oclif has its own test helpers, in `@oclif/test`, so it doesn't need one of yours either.

## 5. Ship it

The same for every tool: build `dist/` with `tsc`, point `bin` at it, and publish. Runa's generator leaves `bin` and the `build` script ready.

What Runa adds, each one a plugin you install and list in `plugins`:

- **Your commands as an agent's tools:** [`@runa-cmd/mcp`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/mcp) adds `--mcp`, which serves every command as an MCP tool with the same schemas.
- **Shell completions:** [`@runa-cmd/completions`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/completions), for bash, zsh and fish. They're a script made from your commands: they complete commands, options and the values of an enum, but not values your CLI computes at that moment. yargs does that, by asking the CLI on each TAB.
- **Help with themes:** [`@runa-cmd/help`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/help).

## Where Runa costs you more

- **Size:** 9.0 MB of dependencies on disk, against 56 KB for citty or cac. 8.3 MB are Zod, and that's the price of validation: see [Types and validation](#types-and-validation). With `--mcp`, 27.9 MB.
- **Startup:** 36 ms over Node with nothing loaded, four times commander's 9. It matters if your CLI runs thousands of times in a loop.
- **Completions:** a script, not the CLI answering each TAB as with yargs, so they can't offer values computed at that moment.
- **Node 24 and ESM:** Runa needs Node 24 or later; commander 15 asks for 22.12, and yargs and cac for 20.19. And Runa only loads with `import`: `require('@runa-cmd/core')` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`, while the other four load from CommonJS too, on Node 26.
- **`@runa-cmd/mcp` is still at `0.x`:** a minor of it may change its contract, while the rest of Runa is at 1.0.
- **A different idea:** returning instead of printing, and options as Zod schemas. If you know commander, it takes a moment to get used to.
- **Each option in two places:** its schema in `options`, and its alias or env var in `meta.options`. commander writes `'-s, --shout'` once.

If size or startup decide it for you, citty and cac are the lightest of these, though you should check how they handle mistakes (section 3). If your CLI is already written with commander and works, the reasons to move are the exit codes, `testCLI()` and `--mcp`, not the code itself: with `extra-typings`, commander already gives you the types.
