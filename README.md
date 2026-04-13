# Runa

**Schema-driven, TypeScript-first CLI framework.**

One Zod schema powers your types, help text, validation, MCP tools, and shell completions. No duplication. No drift.

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
$ my-cli greet world --shout
HELLO, WORLD!
```

## Why Runa?

| Feature | Commander.js | Yargs | Runa |
|---|---|---|---|
| Type inference from schema | No | No | **Yes** |
| Built-in validation | Manual | Manual | **Zod v4** |
| Help generation | Built-in (basic) | Built-in (basic) | **Themeable plugin** |
| MCP server mode | No | No | **One flag: `--mcp`** |
| Shell completions | Manual | Plugin | **Auto-generated** |
| Zero runtime deps (core) | No | No | **Yes** |
| Middleware (onion model) | No | Middleware | **Yes** |
| Plugin system | No | No | **Yes** |
| Config file loading | No | No | **Built-in** |

## Packages

| Package | Description | Status |
|---|---|---|
| [`@runa-cmd/core`](./packages/core) | CLI engine — commands, parsing, plugins, middleware | Stable |
| [`@runa-cmd/help`](./packages/help) | Themeable help output with layout primitives | Stable |
| [`@runa-cmd/mcp`](./packages/mcp) | Model Context Protocol server mode | Stable |
| [`@runa-cmd/completions`](./packages/completions) | Shell completions (bash, zsh, fish) | Stable |

## Quick Start

```bash
pnpm add @runa-cmd/core zod
# Optional:
pnpm add @runa-cmd/help  # Themeable --help
pnpm add @runa-cmd/mcp   # --mcp server mode
pnpm add @runa-cmd/completions  # Shell completions
```

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

## Core Concepts

### Schema is the Source of Truth

Every command defines its interface with Zod schemas. From that single definition, Runa derives:

- **TypeScript types** — Full inference in your `run()` handler, zero manual annotations
- **Validation** — Args and options validated automatically with clear error messages
- **Help text** — `z.describe()` becomes the help description
- **MCP tools** — Each command becomes an MCP tool with the same schema
- **Shell completions** — Enum values, file paths, all from the schema

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

### Value Resolution Order

```
CLI args > Environment variables > Config file values > Zod defaults
```

## Architecture

```
@runa-cmd/core          Zero runtime deps. Parsing via node:util.parseArgs.
    ├── @runa-cmd/help   Themeable help. Layout primitives for custom UIs.
    ├── @runa-cmd/mcp    MCP server via @modelcontextprotocol/sdk.
    └── @runa-cmd/completions  Shell completions (bash, zsh, fish).
```

- **ESM-only** — `type: "module"` everywhere
- **Node 18.3+** — Uses `util.parseArgs` (no polyfill)
- **Zod v4** — Peer dependency, not bundled
- **TypeScript 6** — Strict mode, full inference

## Development

```bash
# Install dependencies
pnpm install

# Run all tests (518 tests across 4 packages)
pnpm test

# Type check
pnpm typecheck

# Lint & format
pnpm lint:fix

# Build
pnpm build

# Clean
pnpm clean
```

## License

MIT
