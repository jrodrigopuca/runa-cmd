# @runa-cmd/core

The engine of the Runa CLI framework. Schema-driven, TypeScript-first, with zero runtime dependencies besides Zod as a required peer.

Define your CLI with Zod schemas and get full type inference, validation, and metadata for help, completions and MCP plugins — from a single source of truth.

**New to Runa?** The [getting started guide](https://github.com/jrodrigopuca/runa-cmd/blob/main/guides/getting-started.md) goes from an empty folder to a CLI you can test, install and publish.

## Install

```bash
pnpm add @runa-cmd/core@beta zod
```

> Requires Node 24+. Zod v4 is a required peer dependency. Without `@beta`, npm installs the older `0.1.0`.

## Quick Start

```ts
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const greet = defineCommand({
  meta: { name: 'greet', description: 'Say hello' },
  args: { name: z.string().describe('Who to greet') },
  run({ args }) {
    console.log(`Hello, ${args.name}!`);
  },
});

runCLI(greet);
```

```
$ greet world
Hello, world!
```

## API

### `defineCommand(config)`

Creates a command with full type inference from Zod schemas to your `run()` handler.

```ts
const deploy = defineCommand({
  meta: {
    name: 'deploy',
    description: 'Deploy to an environment',
    options: {
      env: { alias: ['-e'], env: 'DEPLOY_ENV' },
      replicas: { group: 'Scaling' },
    },
  },
  args: {
    service: z.string().describe('Service to deploy'),
  },
  options: {
    env: z.enum(['staging', 'production']).describe('Target environment'),
    replicas: z.number().default(1).describe('Number of replicas'),
    dryRun: z.boolean().default(false).describe('Preview without deploying'),
  },
  output: z.object({ url: z.string(), replicas: z.number() }),
  async run({ args, options }) {
    // args.service: string
    // options.env: 'staging' | 'production'
    // options.replicas: number
    // options.dryRun: boolean
    // Must return { url: string, replicas: number } (enforced by output schema)
    return {
      url: `https://${options.env}.example.com/${args.service}`,
      replicas: options.replicas,
    };
  },
});
```

#### Config Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `meta.name` | `string` | With `runCLI` | The name of the CLI. In `defineCLI` the key names the command: leave it out, or make it match |
| `meta.description` | `string` | Yes | One-line description |
| `meta.version` | `string` | No | Command version |
| `meta.options` | `Record<string, OptionMeta>` | No | Per-option metadata (alias, env, group, deprecated) |
| `args` | `Record<string, ZodType>` | No | Positional arguments (insertion order matters) |
| `options` | `Record<string, ZodType>` | No | Named options (--flag style) |
| `output` | `ZodType` | No | Output schema — if set, `run()` must return matching data |
| `format` | `(result, { args, options }) => string` | No | What a person reads at the terminal, from what `run()` returned. Adds `--json` |
| `tool` | `boolean` | No | `false` if it's only for people at a terminal: an MCP server won't offer it |
| `run` | `(ctx: RunContext) => RunReturn` | Yes | Command handler |

#### Option Metadata (`meta.options`)

Operational metadata lives in `meta.options`, separate from the Zod schema:

| Property | Type | Description |
|---|---|---|
| `alias` | `string[]` | Short flags, e.g. `['-e']` (must include dash prefix) |
| `env` | `string` | Environment variable name, e.g. `'DEPLOY_ENV'` |
| `configurable` | `boolean` | `false` if a config file can't set it, as with a guardrail. Default: `true` |
| `group` | `string` | Group name for help display, e.g. `'Scaling'` |
| `valueName` | `string` | What help calls the value, e.g. `'hex'` for `--color <hex>`. Defaults to its type |
| `deprecated` | `string` | Deprecation notice, shown in help and as a stderr warning when the option is used |

#### Run Context

Your `run()` handler receives:

```ts
interface RunContext {
  args: InferArgs<TArgs>;         // Typed positional args
  options: InferOptions<TOptions>; // Typed named options
  globalOptions: Record<string, unknown>;
  command: CommandMeta;            // Current command metadata
  rawArgs: string[];               // Original argv
  rest: string[];                  // With `rest: true`, what's left after `--`. Unvalidated
  signal: AbortSignal;             // Aborted when the run must stop
}
```

### What a command returns

Return the data, and Runa shows it. One `run()` serves people and agents:

```ts
const status = defineCommand({
  meta: { name: 'status', description: 'Show the proxy status' },
  run: () => ({ running: true, port: 11435 }),
  format: (result) => `Proxy ${result.running ? 'on' : 'off'}, port ${result.port}`,
});
```

```
$ tool status
Proxy on, port 11435

$ tool status --json
{
  "running": true,
  "port": 11435
}
```

| `run()` returns | At the terminal |
|---|---|
| Nothing | What the command printed |
| A string | The string |
| Anything else | JSON |
| A value, with `format` | What `format` returns, or JSON with `--json` |

`format` also receives the args and options, so what only changes the display stays out of the data, and out of what a model gets:

```ts
run: () => ({ notes: readNotes() }),
format: ({ notes }, { options }) =>
  notes.map((note) => (options.truncate ? note.slice(0, 40) : note)).join('\n'),
```

An MCP tool always gets the data: `format` doesn't run, and `--json` isn't a parameter. A command with `format` that returns nothing fails, so the terminal never stays empty. It can't also declare an option called `json`.

The result goes to stdout, after `output` is validated and before `afterRun`. A command that prints and returns shows both, so print progress with `console.error`, and keep stdout for the result: that's what makes `--json` safe to pipe.

### `defineCLI(config)`

Creates a multi-command CLI with subcommands, plugins, and middleware.

```ts
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { helpPlugin } from '@runa-cmd/help';

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0', description: 'A great CLI' },
  commands: {
    init,
    deploy,
    config: {        // Nested subcommands: my-tool config get, my-tool config set
      get: configGet,
      set: configSet,
    },
  },
  plugins: [helpPlugin()],
  middleware: [timer],
  globalOptions: {
    verbose: z.boolean().default(false).describe('Enable verbose output'),
  },
});

cli.run();
```

#### Config Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `meta.name` | `string` | Yes | CLI name |
| `meta.version` | `string` | No | CLI version |
| `meta.description` | `string` | No | One-line description |
| `commands` | `CommandTree` | Yes | Commands and nested groups |
| `plugins` | `PluginConfig[]` | No | Plugins to load |
| `middleware` | `Middleware[]` | No | Global middleware chain |
| `globalOptions` | `Record<string, ZodType>` | No | Options available to all commands |
| `globalMeta` | `{ options?: Record<string, OptionMeta> }` | No | Metadata for global options |
| `config` | `CLIConfigOptions` | No | Config file loading settings |
| `strictOptions` | `boolean` | No | Reject unknown options. Default: `true` |

### `runCLI(command, options?)`

The API for a CLI made of one command. It takes the same options as `defineCLI`, except `meta` and `commands`, which come from the command, plus `argv`.

```ts
runCLI(myCommand, {
  plugins: [helpPlugin(), mcpPlugin()],
  argv: ['hello'], // Default: process.argv.slice(2)
});
```

The command is the root of the CLI, so a value equal to its name is data: `tool tool` passes `"tool"`. If a plugin adds a subcommand, that name routes to it, and `--` passes it as data: `tool -- completions`.

`defineCLI` always needs the name of a command, even with only one, so use `runCLI` for a CLI of one command.

### Positional arguments

`args` maps positionals by the order of its keys, and only the last one can be a list. A schema works the same as in an option, so `z.number()` delivers a number:

```ts
defineCommand({
  meta: { description: 'Tag notes' },
  args: {
    tag: z.string(),
    ids: z.array(z.number()),  // tool tag urgent 1 2 3
  },
  run({ args }) {
    // args.tag: 'urgent', args.ids: [1, 2, 3]
  },
});
```

### Options that repeat

A `z.array()` option repeats, and each element is converted to its type: `--port 80 --port 81` gives `[80, 81]` with `z.array(z.number())`.

| Source | Form | Result |
|---|---|---|
| Terminal | `--tag a --tag b` | `['a', 'b']` |
| Terminal | `--tag a,b` | `['a,b']` |
| Env | `TAGS=a, b` | `['a', 'b']` |
| Config | `{ "add": { "tag": ["a", "b"] } }` | `['a', 'b']` |

Each source replaces the ones below it, without adding up. A value with a comma can't go through env: use the config file.

### Command names

A command has one name, its key. It's the same at the terminal, in help, in completions, in the config file and in the MCP tool:

```ts
defineCLI({
  meta: { name: 'tool' },
  commands: { 'with-output': report, tags: { 'add-tag': addTag } },
});
```

A key only takes lowercase letters, numbers and dashes. Anything else fails at startup and tells you the right form, as with `withOutput`, which has to be `'with-output'`. There's no conversion, and no second spelling: nothing in your code reads a command by its key.

### Option names

Write `darkColor` in code and `--dark-color` at the terminal. `run()`, config files and MCP tools keep the key.

| Key | Flag |
|---|---|
| `darkColor` | `--dark-color` |
| `outputURL` | `--output-url` |
| `dark-color` | `--dark-color`, a key with hyphens stays as written |

`--darkColor` is a usage error that points to `--dark-color`. `--no-dark-mode` negates `darkMode`.

A boolean named `noCache` stops the CLI at startup, because `--no-cache` already negates `cache`. Declare `cache` with `.default(true)` instead.

### `--help`

Every CLI has `--help` and `-h`, with no plugin: `tool --help` shows the CLI or the root command, and `tool db migrate --help` shows that command, with the global options that work on it.

Each flag yields separately. If a command declares `-h`, for `--host` say, it keeps it and `--help` still shows help. For themes and layout, add `@runa-cmd/help`. To show help your own way from a plugin, declare the `replaceHelp` capability:

```ts
definePlugin({
  meta: { name: 'my-help' },
  capabilities: { replaceHelp: true },
  setup(api) {
    api.replaceHelp((target, output) => output.write(`${render(target)}\n`));
  },
});
```

`target` is a `CLISchema` or a `CommandSchema`. `output` is stdout, or stderr when there was nothing to run. Only one plugin can replace the help.

With nothing to run, as in `tool` on a CLI with several commands or `tool db` on a group, help goes to stderr and the exit code is 2. A script with an empty command fails instead of passing. A name that doesn't exist is still a 127, with a suggestion.

`--help` and `--version` work even if a required global option is missing.

### `--version`

Printed when `meta.version` is set, from `defineCLI` or from the command in `runCLI`. It has no short alias. If the command declares its own `--version` option, that option wins.

### The `--` separator

Everything after the first `--` is never read as a flag. Those tokens fill the positionals still empty, where a variadic counts as one.

What's left is a usage error, so nothing gets lost in silence. A command that wraps another one declares `rest: true` to receive it in `ctx.rest`:

```ts
const run = defineCommand({
  meta: { name: 'run', description: 'Run a program' },
  rest: true,
  run({ rest }) {
    spawn(rest[0], rest.slice(1));
  },
});
```

| Input | Without `rest: true` | With `rest: true` |
|---|---|---|
| `tool -- -text` | `args.content` is `-text` | Same |
| `lint -- -a -b` | `args.files` is `['-a', '-b']` | Same |
| `copy a b -- -c` | Exit 2 | `ctx.rest` is `['-c']` |
| `run -- npm test` (no positionals) | Exit 2 | `ctx.rest` is `['npm', 'test']` |

### `defineMiddleware(handler)`

Creates middleware using the onion model (like Koa/Hono):

```ts
const auth = defineMiddleware(async ({ next, globalOptions }) => {
  if (!globalOptions.token) throw new Error('Missing --token');
  // Code before next() runs before the command
  await next();
  // Code after next() runs after the command
});
```

Middleware, hooks and `run()` get the command that runs as `command`. `command.name` is its own name, and `command.path` the whole path, which is what a permissions or audit check needs: `tag add` and `add` share the name `add`.

```ts
const audit = defineMiddleware(async ({ command, next }) => {
  log(command.path.join(' '));  // 'tag add'
  await next();
});
```

### `definePlugin(config)`

Creates a plugin that extends the CLI:

```ts
const analytics = definePlugin({
  meta: { name: 'analytics', version: '1.0.0' },
  capabilities: { addGlobalOptions: true },
  setup(api) {
    api.addGlobalOption('trackUsage', z.boolean().default(true));
    api.hook('afterRun', (ctx) => {
      if (ctx.globalOptions?.trackUsage) {
        trackEvent(ctx.command?.path.join(' '));
      }
    });
  },
  cleanup() {
    flushAnalytics();
  },
});
```

#### Plugin API

The `setup(api)` function receives:

| Method | Description |
|---|---|
| `api.addCommand(name, command)` | Register a new command (requires `addCommands` capability) |
| `api.addGlobalOption(name, schema, meta?)` | Add a global option (requires `addGlobalOptions` capability) |
| `api.addMiddleware(middleware)` | Add middleware (requires `addMiddleware` capability) |
| `api.hook(name, handler)` | Register a lifecycle hook handler |
| `api.getSchema()` | Get the introspected CLI schema |
| `api.getCommands()` | Get the live command tree reference |
| `api.getConfigValues()` | Get the values of the CLI's config file, if it has one |

### `getSchema(config)`

Introspects a CLI config and returns structured metadata. Used internally by plugins like help and MCP.

```ts
const schema = getSchema(cliConfig);
// schema.meta — CLI name, version, description
// schema.commands — Array of CommandSchema with args, options, etc.
// schema.globalOptions — Array of OptionSchema
```

### `jsonLoader()`

Built-in JSON config file loader, always active when `config` is set:

```ts
const cli = defineCLI({
  // ...
  config: {
    name: 'my-tool',          // Searches for my-tool.config.json
    searchPaths: ['.', '~'],  // Where to search. This is the default
    // loaders: [...]         // Extra formats. The first match wins
  },
});
```

A key at the root is a global option, or a command. Groups nest, and an option uses its key, as in `run()`:

```json
{
  "$schema": "./my-tool.schema.json",
  "store": "./data",
  "clear": { "force": true },
  "tag": {
    "add": { "darkColor": "#222" }
  }
}
```

A value only reaches the command it's under. With `runCLI` there's no command to name, so its options go at the root.

Nothing is ignored. An unknown key exits with 2, naming the file and the key, and `$schema` is the only exception. A global option can't share a name with a command when the CLI has a config file: that fails at startup, for you to rename one.

**The current directory comes first:** a file in `.` can set options, like `force` above, for anyone who runs your CLI there. To protect one option, set `meta.options.force.configurable` to `false`: only the terminal can set it, and the file gets an error. To protect them all, use `searchPaths: ['~']`.

### Error Classes

```ts
import {
  RunaError,            // Base: exit code 1
  ValidationError,      // Exit code 2 (POSIX usage error), has .issues
  ConfigError,          // Exit code 2: the config file can't be used
  CommandNotFoundError,  // Exit code 127, has .suggestion
  CommandError,          // Configurable exit code, for user-thrown errors
} from '@runa-cmd/core';

// Throw from run() handlers:
throw new CommandError('Deployment failed', { code: 'DEPLOY_FAILED', exitCode: 3 });
```

#### How a failed run ends

No failure exits silently. The reason goes to stderr, `cleanup` runs, and then the process exits.

| Case | stderr | Exit code |
|---|---|---|
| `RunaError` with a message | The message, as written | The error's |
| Any other error | `Unexpected error in '<command>': <message>` and a hint | 1 |
| Error without a message | `'<command>' failed without an error message (<type>).` and a hint | The error's, or 1 |
| `onError` sets `ctx.handled` | Nothing from Runa | The error's, or 1 |

- Usage errors end with `Run '<cli> --help' for usage.`
- Throw `CommandError` for messages meant for people using your CLI.
- Set `RUNA_DEBUG=1` to add the stack trace, error code and cause, and to see each step on stderr while it happens: which config file was read, where each option came from, and how long hooks and the command took. It never prints a value, because this output ends up in CI logs.
- `ctx.handled` only stops the default output. If a plugin truly recovered, it sets `process.exitCode = 0` in `onError`.

#### How a run stops

On `SIGINT` or `SIGTERM`, Runa aborts `ctx.signal` and runs `cleanup`, and the process exits with 130 or 143. A command that ignores the signal stops being waited for after 2 seconds, and the process ends after 5 at most. A second signal leaves at once.

Pass `signal` to whatever the command starts, so the stop reaches it too:

```ts
async run({ signal }) {
  await fetch(url, { signal });
}
```

A command that blocks the event loop can't react to a signal until it yields. Use `Ctrl+\` to end it at once.

### Constants

```ts
import { HOOK_NAMES, PARAM_TYPES } from '@runa-cmd/core';

HOOK_NAMES.BEFORE_PARSE   // 'beforeParse'
HOOK_NAMES.ON_GLOBAL_FLAGS // 'onGlobalFlags'
HOOK_NAMES.AFTER_PARSE     // 'afterParse'
HOOK_NAMES.BEFORE_RUN      // 'beforeRun'
HOOK_NAMES.AFTER_RUN       // 'afterRun'
HOOK_NAMES.ON_ERROR        // 'onError'
HOOK_NAMES.CLEANUP         // 'cleanup'

PARAM_TYPES.STRING   // 'string'
PARAM_TYPES.NUMBER   // 'number'
PARAM_TYPES.BOOLEAN  // 'boolean'
PARAM_TYPES.ENUM     // 'enum'
PARAM_TYPES.ARRAY    // 'array'
```

### Testing: `testCLI()`

Run a command through its real lifecycle, without ending the process:

```ts
import { testCLI } from '@runa-cmd/core/testing';

const result = await testCLI(cli, ['add', 'x'], {
  env: { TOKEN: 'abc' },            // What Runa sees as the environment
  config: { add: { tag: ['a'] } },  // The contents of the config file
});

result.code;    // The exit code the process would end with
result.stdout;  // What it printed, and result.stderr
result.result;  // What run() returned
result.error;   // The original error, with its class, code and cause
result.trace;   // What happened, in order
```

It takes a CLI or a single command, and a single command also accepts `plugins`, `middleware`, `globalOptions` and `globalMeta`.

`trace` says where each value came from, which hooks ran and for how long, and everything written, in order:

```ts
[
  { step: 'option', name: 'tag', scope: 'command', source: 'config', value: ['a'] },
  { step: 'option', name: 'token', scope: 'command', source: 'env' },
  { step: 'hook', name: 'beforeRun', ms: 1 },
  { step: 'output', stream: 'stdout', text: 'Added x\n' },
  { step: 'run', command: ['add'], ms: 12 },
]
```

A value from env is left out, because it can be a secret. The shape of `trace` isn't part of the [versioning contract](https://github.com/jrodrigopuca/runa-cmd/blob/main/VERSIONING.md).

**What's isolated:** the test doesn't read the real environment or config files, and several runs can share a process, as with `it.concurrent`.

**What isn't:** a command that reads `process.env` by itself sees the real one. A child process, or a write straight to a file descriptor, isn't captured. `process.exitCode` is global, so it isn't reliable with concurrent runs: exit or throw instead.

A `process.exit` inside a command ends the run with its code and skips `cleanup`, as in a real run.

### Subpath Export: `@runa-cmd/core/zod`

Re-exports Zod v4 for convenience:

```ts
import { z } from '@runa-cmd/core/zod';
// Same as: import { z } from 'zod';
```

## Lifecycle

The full execution lifecycle with seven hooks:

```
beforeParse
    ↓
  Parse global flags
    ↓
onGlobalFlags  ← (help/mcp plugins intercept here)
    ↓
  Resolve command from argv
    ↓
  Parse command args & options
    ↓
afterParse
    ↓
beforeRun
    ↓
  Middleware chain (onion model)
    ↓
  command.run()
    ↓
afterRun
    ↓
cleanup  ← (Runs on errors and on signals, within the stop deadline)

On error → onError hook fires before cleanup
```

## Value Resolution

Options are resolved in this priority order:

```
CLI args > Environment variables > Config file values > Zod defaults
```

For example, if an option has `env: 'PORT'` and `z.number().default(3000)`:
1. `--port 8080` wins over everything
2. `PORT=4000` wins over config file and default
3. Config file value wins over default
4. `3000` is the fallback

Boolean options accept `true`, `1`, `false` and `0`, in any case, from every source: `MINIFY=1`, `--minify=false`, or `"minify": true` in a config file. Any other value is a usage error.

## Types

All types are exported for consumers who need them:

```ts
import type {
  CLI, CLIConfig, CLIMeta, CLISchema, CLIConfigOptions,
  Command, CommandConfig, CommandMeta, CommandSchema, CommandTree,
  HookContext, HookHandler, HookName,
  Middleware, MiddlewareContext, MiddlewareFn,
  PluginAPI, PluginCapabilities, PluginConfig, PluginMeta,
  RunContext, RunReturn,
  ArgSchema, OptionSchema, OptionMeta,
  InferArgs, InferOptions,
  ConfigLoader, ParamMetadata, ParamType,
} from '@runa-cmd/core';
```

## License

MIT
