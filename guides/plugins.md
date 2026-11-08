# Middleware and plugins

How to add behavior around your commands, without writing it into each one: middleware for what wraps a command as it runs, and plugins for what extends the whole CLI.

It follows `todo`, a CLI with two commands, `task list` and `task remove`, a middleware that refuses commands that write in read-only mode, and a plugin that adds `--timing`. The code is [`examples/plugins`](https://github.com/jrodrigopuca/runa-cmd/tree/main/examples/plugins), and its tests run in CI.

## Which one you need

| You want to | Use | Because |
|---|---|---|
| Run code before and after a command, or stop it | Middleware | It wraps the command, and decides whether it runs |
| React to a moment of every run, such as an error or the end | A hook, from a plugin | It runs at that step, whatever the command |
| Add options, commands or help to the CLI | A plugin | It extends the CLI, and declares what it adds |
| Share any of these between CLIs | A plugin, as a package | It brings its own middleware, hooks and options |

## Middleware

A middleware gets the command that runs and the global options, and calls `next()` to run it. What comes before `next()` runs before the command, and what comes after runs after it:

<!-- file: examples/plugins/src/read-only.ts -->
```ts
import { CommandError, defineMiddleware } from '@runa-cmd/core';

/**
 * Stops the commands that write when the global `readOnly` is on. It names
 * commands by their whole path: `task remove` and a `remove` elsewhere are
 * different commands.
 */
export function readOnly(writes: string[]) {
	return defineMiddleware(async ({ command, globalOptions, next }) => {
		const path = command.path.join(' ');
		if (globalOptions.readOnly && writes.includes(path)) {
			throw new CommandError(`'${path}' changes data, and read-only mode is on.`, {
				code: 'READ_ONLY',
				exitCode: 3,
			});
		}
		await next();
	});
}
```

The rules:

- **Always `await next()`.** Returning without calling it fails with `MIDDLEWARE_DID_NOT_CALL_NEXT`, because the command wouldn't run and the CLI would still exit with 0. Calling it without `await` fails with `MIDDLEWARE_DID_NOT_AWAIT_NEXT`: hooks and cleanup would run while the command still works.
- **To stop a command, throw.** A `CommandError` says why, with your exit code. A dry run is the same, with `exitCode: 0`: `throw new CommandError('Dry run: would remove 2', { exitCode: 0 })`.
- **Name a command by `command.path`.** `command.name` is only the last part: `task remove` and a `remove` at the root share it.
- **It sees global options, not the command's own.** What it reads is the same for every command, so make it a global option, as `readOnly` is here. Declared with `env`, it comes from `--read-only` or from `READ_ONLY=1`, and a test hands it in with `env`.
- **Errors from `next()` reach it.** Wrap `await next()` in `try` to time a failure or add to it. If you catch an error and don't throw it again, the run is a success.

With several middleware, the first one in the list is the outermost: it starts first and ends last.

## Plugins

A plugin is a `setup(api)` function that extends the CLI when it starts:

<!-- file: examples/plugins/src/timing.ts -->
```ts
import { definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

/** Adds --timing, which says how long each command took, on stderr. */
export function timingPlugin() {
	let started = 0;

	return definePlugin({
		meta: { name: 'timing', description: 'Says how long a command took' },
		// Each thing a plugin adds to the CLI is declared up front
		capabilities: { addGlobalOptions: true },
		setup(api) {
			api.addGlobalOption('timing', z.boolean().default(false).describe('Say how long it took'));

			api.hook('beforeRun', () => {
				started = performance.now();
			});
			api.hook('afterRun', (ctx) => {
				// In a tool call, stderr reaches the model too: keep it for people
				if (!ctx.globalOptions?.timing || ctx.invocation.surface === 'tool') return;
				const ms = Math.round(performance.now() - started);
				console.error(`${ctx.command?.path.join(' ')} took ${ms} ms`);
			});
		},
	});
}
```

- **Capabilities.** A plugin declares what it adds: `addGlobalOptions`, `addCommands`, `addMiddleware` or `replaceHelp`. Calling `api.addGlobalOption()` without declaring it stops the CLI at startup, naming the plugin and the capability. Whoever installs a plugin can read, in one line, what it changes.
- **A function that returns the plugin**, as `timingPlugin()`, lets it take options and keeps its state, like `started`, to one CLI.
- **`ctx.invocation.surface`** is `'cli'` for a person, and `'tool'` for a call through [MCP](./mcp.md). Anything a tool writes reaches the model, so leave out what's only for people.
- **`dependencies`** in `meta` names plugins this one needs, so they're set up first.

### The hooks, in order

For a command that ends well:

1. `beforeParse`
2. `onGlobalFlags`: the global options are read. Help and `--mcp` stop the run here.
3. `afterParse`: the command and its values are known.
4. `beforeRun`
5. The middleware, and `run()` inside them.
6. `afterRun`
7. `cleanup`

If something fails, `onError` comes before `cleanup`, and `afterRun` doesn't run. `cleanup` runs after an error and after Ctrl+C too, so it's the place to close what the run opened.

A plugin can also have its own `cleanup()`, next to `setup`. It runs after the `cleanup` hook, and also when the CLI fails to start, before any hook runs: use it for what `setup` itself opened.

## Using them

<!-- file: examples/plugins/src/cli.ts -->
```ts
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { readOnly } from './read-only.ts';
import { timingPlugin } from './timing.ts';

const tasks = ['Write the guide', 'Review it'];

const list = defineCommand({
	meta: { description: 'List the tasks' },
	run: () => tasks.map((task, i) => `${i + 1}. ${task}`).join('\n'),
});

const remove = defineCommand({
	meta: { description: 'Remove a task' },
	args: { number: z.number().int().min(1).describe('Which one, as list shows it') },
	// A real CLI would save the change; this one only says what it would remove
	run: ({ args }) => `Removed '${tasks[args.number - 1]}'`,
});

export const cli = defineCLI({
	meta: { name: 'todo', version: '1.0.0', description: 'Keep a list of tasks' },
	commands: { task: { list, remove } },
	// A global option, so the middleware reads it from the terminal or from env
	globalOptions: { readOnly: z.boolean().default(false).describe('Refuse commands that write') },
	globalMeta: { options: { readOnly: { env: 'READ_ONLY' } } },
	middleware: [readOnly(['task remove'])],
	plugins: [timingPlugin()],
});
```

```console
$ todo task list --timing
1. Write the guide
2. Review it
task list took 0 ms

$ READ_ONLY=1 todo task remove 1
'task remove' changes data, and read-only mode is on.
```

## Testing them

`testCLI()` runs them as they run for real. Hand in what they read, as `env`, and check what they let through and what they stop:

<!-- file: examples/plugins/src/cli.test.ts -->
```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
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
	assert.equal((result.error as { code?: string }).code, 'READ_ONLY');
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
```

Test both sides of each rule: that the middleware stops a command that writes, and that it lets it through when it should. A test for only one of them passes for a middleware that always blocks, or one that never does.

To test a plugin on its own, pass it to a single command: `testCLI(command, argv, { plugins: [timingPlugin()] })`. [Testing a CLI](./testing.md) covers the rest.

## Publishing a plugin

A plugin in its own package declares `@runa-cmd/core` as a peer dependency, with the lowest version it works with, so it uses the core of the CLI that installs it, and npm refuses one that's too old:

```json
{
	"peerDependencies": {
		"@runa-cmd/core": "^0.2.0-beta.6",
		"zod": "^4.0.0"
	}
}
```

Raise that lowest version when the plugin starts using something new from core. `meta.version` is informative only: Runa doesn't read it.
