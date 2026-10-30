# @runa-cmd/core

The engine of the Runa CLI framework. Schema-driven, TypeScript-first, with zero runtime dependencies besides Zod as a required peer.

Define your CLI with Zod schemas and get full type inference, validation, and metadata for help, completions and MCP plugins — from a single source of truth.

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
| `meta.name` | `string` | Yes | Command name |
| `meta.description` | `string` | Yes | One-line description |
| `meta.version` | `string` | No | Command version |
| `meta.options` | `Record<string, OptionMeta>` | No | Per-option metadata (alias, env, group, deprecated) |
| `args` | `Record<string, ZodType>` | No | Positional arguments (insertion order matters) |
| `options` | `Record<string, ZodType>` | No | Named options (--flag style) |
| `output` | `ZodType` | No | Output schema — if set, `run()` must return matching data |
| `run` | `(ctx: RunContext) => RunReturn` | Yes | Command handler |

#### Option Metadata (`meta.options`)

Operational metadata lives in `meta.options`, separate from the Zod schema:

| Property | Type | Description |
|---|---|---|
| `alias` | `string[]` | Short flags, e.g. `['-e']` (must include dash prefix) |
| `env` | `string` | Environment variable name, e.g. `'DEPLOY_ENV'` |
| `group` | `string` | Group name for help display, e.g. `'Scaling'` |
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
  rest: string[];                  // After `--`, what didn't fill a positional. Unvalidated
}
```

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

`defineCLI` with a single command also works, but it's deprecated: adding a plugin that registers a command silently changes how it routes.

### `--version`

Printed when `meta.version` is set, from `defineCLI` or from the command in `runCLI`. It has no short alias. If the command declares its own `--version` option, that option wins.

### The `--` separator

Everything after the first `--` is never read as a flag. Those tokens fill the positionals still empty, where a variadic counts as one, and what's left arrives in `ctx.rest`.

| Input | Result |
|---|---|
| `tool -- -text` | `args.content` is `-text` |
| `copy a b -- -c` | `ctx.rest` is `['-c']` |
| `lint -- -a -b` | `args.files` is `['-a', '-b']` |
| `lint a.ts -- --fix` | `args.files` is `['a.ts']`, `ctx.rest` is `['--fix']` |
| `run -- npm test` (no positionals) | `ctx.rest` is `['npm', 'test']` |

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
        trackEvent(ctx.command?.name);
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

### Error Classes

```ts
import {
  RunaError,            // Base: exit code 1
  ValidationError,      // Exit code 2 (POSIX usage error), has .issues
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

- Usage errors end with `Run '<cli> --help' for usage.` when the CLI has a `--help` option.
- Throw `CommandError` for messages meant for people using your CLI.
- Set `RUNA_DEBUG=1` to add the stack trace, error code and cause.
- `ctx.handled` only stops the default output. If a plugin truly recovered, it sets `process.exitCode = 0` in `onError`.

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
cleanup  ← (ALWAYS runs, even on error)

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
