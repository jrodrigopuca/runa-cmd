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
| `alias` | `string[]` | Other flags for the option: one character as `'-e'`, or a word as `'--environment'`. Any other form, as `'e'` or `'-ab'`, stops the CLI at startup and says how to write it |
| `env` | `string` | Environment variable name, e.g. `'DEPLOY_ENV'`. If a required option is missing, the error names it: `Missing required option: --env, or set DEPLOY_ENV` |
| `configurable` | `boolean` | `false` if a config file can't set it, as with a guardrail. Default: `true` |
| `group` | `string` | Group name for help display, e.g. `'Scaling'` |
| `valueName` | `string` | What help calls the value, e.g. `'hex'` for `--color <hex>`. Defaults to its type |
| `defaultDescription` | `string` | What help shows as the default, e.g. `'~/.tool/control.sock'` for a path built from the home folder. The command still gets the real value |
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

`--darkColor` is a usage error that points to `--dark-color`. `--no-dark-mode` negates `darkMode`. A boolean whose default is `true` shows in help as `--[no-]dark-mode`, and is the only kind that shell completions offer a `--no-` for: one that starts off has nothing to turn off.

A value that breaks a rule of its schema names the flag, repeats what was typed, and says what's wrong: `.positive()` gives `Invalid value '0' for --limit: must be greater than 0`, and `.min(3)` on a string `must have at least 3 characters`. Write your own message for other rules, as with `.regex(re, '--color must start with #')`, and it's shown as you wrote it.

The value is only repeated if it was typed at the terminal or sent by a model, and cut after 40 characters. A value from env or from the config file is never shown, nor the value of an option that declares `env`, even typed: those often hold a secret, and an error can end up in a CI log.

A boolean named `noCache` stops the CLI at startup, because `--no-cache` already negates `cache`. Declare `cache` with `.default(true)` instead.

### Environment variables

An option reads a variable only if it declares one, in `meta.options`. Nothing is read by a prefix, so the environment can't turn on an option you didn't mean it to, like `--force`:

```ts
defineCommand({
  meta: { name: 'tool', description: 'Migrate', options: { database: { env: 'TOOL_DATABASE_URL' } } },
  options: { database: z.string().describe('Database to migrate') },
  run({ options }) { /* options.database comes from --database or TOOL_DATABASE_URL */ },
});
```

The value is converted like one typed at the terminal, which wins over it: `TOOL_STEPS=3` gives a number, `1` and `0` give booleans, and `a, b` gives a list. Help shows the variable, a missing required option names it, and an MCP tool leaves the option out, because it's set by whoever runs the server.

You choose the name. A convention that helps:

- **Start with the name of your CLI**, as in `TOOL_DATABASE_URL`. It doesn't collide with other programs, and shows whose variable it is.
- **Reuse a well-known variable only when it means the same thing** and your users already set it, such as `NO_COLOR`, `HTTP_PROXY`, or `OLLAMA_URL` in a tool made for Ollama.

### `--help`

Every CLI has `--help` and `-h`, with no plugin: `tool --help` shows the CLI or the root command, and `tool db migrate --help` shows that command. Its own options come first, and the global options that work on it, as `--help` or `--mcp`, go apart under `GLOBAL OPTIONS`; a custom renderer tells them apart by `inherited` on each option. With `runCLI`, the command is the CLI, so they're its own options.

`help` works where a command goes, as people and models often type it: `tool help` is `tool --help`, `tool help db migrate` is `tool db migrate --help`, and `tool db help` shows the group. A command of yours named `help` wins, and inside a command `help` is a value: `tool greet help` passes it to the argument. It isn't a command, so it doesn't show in the list, nor as an MCP tool.

After a usage error, the hint points to the help that answers it: `tool build --limit 0` ends with `Run 'tool build --help' for usage.`

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

A middleware must `await next()`, or throw to stop the command. Returning without calling it fails with `MIDDLEWARE_DID_NOT_CALL_NEXT`, because the command would not run and the CLI would still exit 0. Calling it without `await` fails with `MIDDLEWARE_DID_NOT_AWAIT_NEXT`, after the command ends, so `afterRun` and `cleanup` never run while it still works. To skip a command on purpose, as a dry run does, throw `new CommandError('Dry run: would deploy api', { exitCode: 0 })`.

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

A value can be its JSON type, or the text you'd type at the terminal: `"limit": 5` and `"limit": "5"` are the same, and so are `"force": true` and `"force": "true"`. Text is accepted because a loader may only produce text, as one for an INI file. A number is not a boolean: `"force": 1` is an error that says `expected true or false`.

Nothing is ignored. Every error names the file first, and says what's wrong with the words the terminal uses:

```
my-tool.config.json: invalid value for 'clear.limit': must be greater than 0
my-tool.config.json: unknown key 'clear.limt'. Did you mean 'limit'?
my-tool.config.json: invalid JSON: Unexpected token '}', ..."force":tru}}" is not valid JSON
```

All exit with 2. The code says what failed, and the message says where: a value that breaks its schema is a `VALIDATION_ERROR`, as it would be from the terminal or from env, and a file that can't be read as config, with broken JSON or an unknown key, is an `INVALID_CONFIG`. `$schema` is the only key that isn't checked. A global option can't share a name with a command when the CLI has a config file: that fails at startup, for you to rename one.

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

#### Error codes

Tell errors apart by their `code`, not by the message: codes are part of the [contract](../../VERSIONING.md), and messages change. `isRunaError(error, code?)` checks both, and works even when two copies of `@runa-cmd/core` are installed, where `instanceof` fails. `ERROR_CODES` lists Runa's codes, and a `CommandError` takes your own:

```ts
import { ERROR_CODES, isRunaError } from '@runa-cmd/core';

if (isRunaError(error, ERROR_CODES.INVALID_CONFIG)) { /* the config file is wrong */ }
if (isRunaError(error, 'DEPLOY_FAILED')) { /* your own code */ }
```

The value that's wrong has one code wherever it comes from, terminal, env or config file, and the message says where. These come up while someone runs the CLI:

| Code | Exit | When |
|---|---|---|
| `VALIDATION_ERROR` | 2 | An argument or option is missing, or breaks its schema. `ValidationError` |
| `INVALID_CONFIG` | 2 | The config file can't be used: broken JSON, an unknown key, or a value where an object goes. `ConfigError` |
| `COMMAND_NOT_FOUND` | 127 | No command has that name. `CommandNotFoundError` |
| `COMMAND_ERROR` | 1 | A `CommandError` without its own code |
| `INTERRUPTED` | The signal's | `SIGINT` or `SIGTERM` stopped the run, and `run()` failed because of it or didn't end in time |
| `INVALID_OUTPUT` | 1 | `run()` returned a value its `output` schema rejects |
| `MISSING_RESULT` | 1 | The command declares `format`, and `run()` returned nothing |
| `MIDDLEWARE_DID_NOT_CALL_NEXT` | 1 | A middleware returned without calling `next()`, so the command didn't run |
| `MIDDLEWARE_DID_NOT_AWAIT_NEXT` | 1 | A middleware called `next()` without awaiting it |

These stop the CLI at startup, all with exit 1. They point at the CLI's code, so its author sees them the first time it runs:

| Code | When |
|---|---|
| `OPTION_COLLISION` | Two options end up as the same flag or alias: two keys of a command, two globals, a global and a command's option, or an option where `format` adds `--json` |
| `INVALID_OPTION_NAME` | A boolean `noCache` would clash with `--no-cache`, which already negates `cache` |
| `INVALID_OPTION_ALIAS` | An alias isn't `-x`, one character, nor `--word`, as `'e'` or `'-ab'`: the message says how to write it |
| `INVALID_META_OPTIONS` | `meta.options` names a key that `options` doesn't have |
| `INVALID_VARIADIC_ARGS` | A command has more than one list argument |
| `INVALID_VARIADIC_POSITION` | The list argument isn't the last one |
| `INVALID_COMMAND_NAME` | A command key isn't lowercase words joined by dashes, or doesn't match its `meta.name` |
| `INVALID_COMMAND_VERSION` | A command of `defineCLI` declares `meta.version`, which only applies to the command of `runCLI`: the CLI's version goes in `defineCLI`'s `meta` |
| `CONFIG_COLLISION` | A global option and a command share a name, so a config file can't tell them apart |
| `INVALID_PLUGIN` | A plugin without `meta.name` or `setup()` |
| `PLUGIN_LOAD_ERROR` | A lazy plugin failed to load, or its module has no default export |
| `PLUGIN_MISSING_DEPENDENCY` | A plugin depends on one that isn't registered |
| `PLUGIN_CIRCULAR_DEPENDENCY` | Plugins depend on each other in a cycle |
| `PLUGIN_CAPABILITY_VIOLATION` | A plugin used part of the API without declaring its capability |
| `HELP_ALREADY_REPLACED` | Two plugins replace the help |

`@runa-cmd/mcp` adds its own, listed in [its README](../mcp/README.md#errors).

#### How a failed run ends

No failure exits silently. The reason goes to stderr, `cleanup` runs, and then the process exits.

`cli.run()` and `runCLI()` are the entry point of a process: they own its exit code and its signals, so call them once, from your `main.ts`. To run the CLI and keep going, as a test does, use [`testCLI()`](#testing-testcli). To call it from another program, start it as a subprocess and read its exit code, stdout and stderr.

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

On `SIGINT` or `SIGTERM`, Runa aborts `ctx.signal` and runs `cleanup`, and the process ends by that same signal, so the shell sees 130 or 143. A command that ignores the signal stops being waited for after 2 seconds, and the process ends after 5 at most. A second signal leaves at once.

If `run()` ends well after the signal, as a server that closes when told to, that's not an error: nothing is printed and `onError` doesn't run. If it fails because of the abort, or doesn't end in time, stderr says `Interrupted.`.

Ending by the signal, instead of with exit code 143, is what makes a stop clean for a service manager: systemd counts death by `SIGTERM` as clean, and exit 143 as a failure. A program that starts your CLI with `spawn` sees `signal: 'SIGTERM'`, not `code: 143`, and gets the number a shell shows with `code ?? 128 + os.constants.signals[signal]`. On Windows, which has no signals, it exits with the code. Under launchd, stop a service with `launchctl bootout`: with `KeepAlive` → `SuccessfulExit: false`, a `launchctl kill` restarts it, as it does with any daemon that dies by the signal.

Pass `signal` to whatever the command starts, so the stop reaches it too:

```ts
async run({ signal }) {
  await fetch(url, { signal });
}
```

A command that blocks the event loop can't react to a signal until it yields. Use `Ctrl+\` to end it at once.

### Constants

```ts
import { ERROR_CODES, HOOK_NAMES, PARAM_TYPES } from '@runa-cmd/core';

ERROR_CODES.VALIDATION_ERROR // 'VALIDATION_ERROR', and every code in Error codes

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

Run a command through its real lifecycle, without ending the process. [Testing a CLI](https://github.com/jrodrigopuca/runa-cmd/blob/main/guides/testing.md) shows it test by test, and what needs a real process instead.

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

**`config` needs a CLI that reads one:** if the CLI doesn't declare `config` in `defineCLI`, `testCLI()` rejects with a message saying so, because the real program would read no file. For a single command, `config` stands for the file of `runCLI(command, { config })`.

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

What a hook gets grows as the run goes on: `globalOptions` from `onGlobalFlags`, and `command`, `args` and `options` from `afterParse`. Two fields differ from what `run()` gets:

- **`ctx.rawArgs`** is the whole argv in `beforeParse`, where a hook may rewrite it before parsing. From `onGlobalFlags` on, it's only the command's part, without the global options and without what follows `--`. `run()` gets the original argv as it was.
- **`ctx.invocation`** says who started the run: `{ surface: 'cli' }` for a person or a script, and `{ surface: 'tool', tool }` for a call through MCP, where everything written reaches the model. `run()` doesn't get it, on purpose: a command does the same work for both, and what only people read goes in `format`, which doesn't run for a tool.

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
  RunContext, RunReturn, RunResult, FormatContext,
  ArgSchema, OptionSchema, OptionMeta,
  InferArgs, InferOptions,
  ConfigLoader, ParamMetadata, ParamType,
} from '@runa-cmd/core';
```

## License

MIT
