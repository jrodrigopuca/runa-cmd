# Runa

**One command, for people and agents.**

Runa is a schema-driven, TypeScript-first CLI framework. One Zod schema powers your types, validation, help text, shell completions and MCP tools. No duplication. No drift.

> **Beta.** The API can still change before 1.0: see the [status](./docs/status.md), the [known issues](./docs/known-issues.md) and the [roadmap](./docs/backlog.md).

```ts
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const greet = defineCommand({
  meta: { name: 'greet', description: 'Say hello' },
  args: { name: z.string().describe('Who to greet') },
  options: { shout: z.boolean().default(false).describe('UPPERCASE output') },
  run({ args, options }) {
    // args.name is string, options.shout is boolean — fully inferred
    const msg = `Hello, ${args.name}!`;
    console.log(options.shout ? msg.toUpperCase() : msg);
  },
});

runCLI(greet);
```

```
$ greet world --shout
HELLO, WORLD!
```

## Why Runa?

| Feature | Commander.js | Yargs | Runa |
|---|---|---|---|
| Type inference from schema | No | No | **Yes** |
| Built-in validation | Manual | Manual | **Zod v4** |
| Help generation | Built-in (basic) | Built-in (basic) | **Themeable plugin** |
| MCP server mode | No | No | **One flag: `--mcp`** |
| Shell completions | Manual | Built-in | **Auto-generated** |
| Zero runtime deps (core) | Yes | No | **Yes**, with Zod as a required peer |
| Middleware (onion model) | No | Middleware | **Yes** |
| Plugin system | No | No | **Yes** |
| Config file loading | No | No | **Built-in** |

## Packages

| Package | Description | Status |
|---|---|---|
| [`@runa-cmd/core`](./packages/core) | CLI engine — commands, parsing, plugins, middleware | Beta |
| [`@runa-cmd/help`](./packages/help) | Themeable help output with layout primitives | Beta |
| [`@runa-cmd/mcp`](./packages/mcp) | Model Context Protocol server mode | Beta |
| [`@runa-cmd/completions`](./packages/completions) | Shell completions (bash, zsh, fish) | Beta |

## Quick Start

Requires Node 24+. This README describes the `beta` release: without `@beta`, npm installs the older `0.1.0`.

```bash
pnpm add @runa-cmd/core@beta zod
# Optional:
pnpm add @runa-cmd/help@beta  # --help is not built in yet
pnpm add @runa-cmd/mcp@beta   # --mcp server mode
pnpm add @runa-cmd/completions@beta  # Shell completions
```

Zod is required: it's how you define commands.

### Single Command

```ts
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const build = defineCommand({
  meta: {
    name: 'build',
    description: 'Build the project',
    options: {
      outDir: { alias: ['-o'], env: 'BUILD_OUT_DIR' },
      minify: { group: 'Optimization' },
    },
  },
  options: {
    outDir: z.string().default('./dist').describe('Output directory'),
    minify: z.boolean().default(false).describe('Minify output'),
  },
  run({ options }) {
    console.log(`Building to ${options.outDir}...`);
  },
});

runCLI(build);
```

`runCLI` is the API for one command, and it takes plugins too: `runCLI(build, { plugins: [helpPlugin(), mcpPlugin()] })`. A value equal to the command name is data, never routing. `--version` works as soon as `meta.version` is set.

### Multi-Command with Plugins

```ts
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { helpPlugin } from '@runa-cmd/help';
import { mcpPlugin } from '@runa-cmd/mcp';
import { completionsPlugin } from '@runa-cmd/completions';

const init = defineCommand({
  meta: { name: 'init', description: 'Initialize a new project' },
  args: { name: z.string().describe('Project name') },
  run({ args }) {
    console.log(`Creating ${args.name}...`);
  },
});

const deploy = defineCommand({
  meta: {
    name: 'deploy',
    description: 'Deploy to production',
    options: { env: { alias: ['-e'] } },
  },
  options: {
    env: z.enum(['staging', 'production']).describe('Target environment'),
  },
  output: z.object({ url: z.string() }),
  async run({ options }) {
    const url = `https://${options.env}.example.com`;
    return { url };
  },
});

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0', description: 'My awesome CLI' },
  commands: { init, deploy },
  plugins: [helpPlugin(), mcpPlugin(), completionsPlugin()],
});

cli.run();
```

```bash
$ my-tool --help          # Beautifully formatted help
$ my-tool deploy -e staging
$ my-tool --mcp           # Start as MCP server for AI agents
$ my-tool completions bash  # Generate shell completions
```

With MCP, a tool is the same command a person runs: each call runs your CLI as a child process, with its env vars, config, hooks and middleware. See the [MCP package](./packages/mcp#current-limitations) for what's still missing.

## Core Concepts

### Schema is the Source of Truth

Every command defines its interface with Zod schemas. From that single definition, Runa derives:

- **TypeScript types** — Full inference in your `run()` handler, zero manual annotations
- **Validation** — Args and options validated automatically with clear error messages
- **Help text** — `z.describe()` becomes the help description
- **MCP tools** — Each command becomes an MCP tool with the same schema
- **Shell completions** — Commands, flags and enum values, all from the schema

### Five Layers of Complexity

1. **Hello World** — `defineCommand` + `runCLI`
2. **Rich Options** — Aliases, env vars, groups, deprecation via `meta.options`
3. **Positional Args** — Object with insertion-order keys, variadic support
4. **Subcommands** — `defineCLI` with nested command trees
5. **Middleware** — Koa/Hono onion model for cross-cutting concerns

### Plugin System

Plugins extend the CLI with capabilities:

```ts
import { definePlugin } from '@runa-cmd/core';

const myPlugin = definePlugin({
  meta: { name: 'my-plugin', version: '1.0.0' },
  capabilities: { addCommands: true, addGlobalOptions: true },
  setup(api) {
    api.addGlobalOption('verbose', z.boolean().default(false));
    api.hook('beforeRun', (ctx) => {
      if (ctx.globalOptions?.verbose) console.log('Verbose mode on');
    });
  },
});
```

### Middleware

Follows the onion model — code before `next()` runs pre-command, code after runs post-command:

```ts
import { defineMiddleware } from '@runa-cmd/core';

const timer = defineMiddleware(async ({ next }) => {
  const start = performance.now();
  await next();
  console.log(`Done in ${(performance.now() - start).toFixed(0)}ms`);
});
```

### Lifecycle Hooks

Seven hooks in execution order:

```
beforeParse → onGlobalFlags → afterParse → beforeRun → run() → afterRun → cleanup
                                                                   ↘ onError (if error)
```

### Error Handling

POSIX-aligned exit codes with typed error classes:

| Error | Exit Code | When |
|---|---|---|
| `RunaError` | 1 | Base error class |
| `ValidationError` | 2 | Invalid args/options |
| `CommandNotFoundError` | 127 | Unknown command (with "did you mean?" suggestions) |
| `CommandError` | configurable | Thrown from `run()` handlers |

No failure exits silently. Typed errors print as written, so throw `CommandError` for messages meant for people using your CLI. Any other error prints the failing command and a hint:

```
Unexpected error in 'deploy': kaboom
Run with RUNA_DEBUG=1 for details.
```

`RUNA_DEBUG=1` adds the stack trace, error code and cause. `cleanup` always runs before the process exits.

### Value Resolution Order

```
CLI args > Environment variables > Config file values > Zod defaults
```

Boolean options accept `true`, `1`, `false` and `0` from any source.

## Architecture

```
@runa-cmd/core          Zero runtime deps, Zod as a peer. Parsing via node:util.parseArgs.
    ├── @runa-cmd/help   Themeable help. Layout primitives for custom UIs.
    ├── @runa-cmd/mcp    MCP server via @modelcontextprotocol/sdk.
    └── @runa-cmd/completions  Shell completions (bash, zsh, fish).
```

- **ESM-only** — `type: "module"` everywhere
- **Node 24+** — Uses stable `util.parseArgs` (no polyfill)
- **Zod v4** — Peer dependency, not bundled
- **TypeScript 6** — Strict mode, full inference

## Documentation

Everything about the project lives in [`docs/`](./docs/README.md): [status](./docs/status.md), [known issues](./docs/known-issues.md), [backlog](./docs/backlog.md), [architecture](./docs/architecture.md), [components](./docs/components/), [flows](./docs/flows/) and [decisions](./docs/adr/README.md).

## Development

```bash
# Install dependencies
pnpm install

# Build first: tests and packages use the compiled output
pnpm build

# Run all tests
pnpm test

# Type check
pnpm typecheck

# Lint & format
pnpm lint:fix

# Check the documentation
pnpm docs:check

# Clean
pnpm clean
```

## License

MIT
