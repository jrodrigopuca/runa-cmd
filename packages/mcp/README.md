# @runa-cmd/mcp

Turn any Runa CLI into an [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server with a single flag.

Every command becomes an MCP tool. Zod schemas pass directly to the MCP SDK — zero schema conversion needed.

## Install

```bash
pnpm add @runa-cmd/mcp@beta
```

> Peer dependencies: `@runa-cmd/core` and `zod ^4.0.0`.
> Runtime dependency: `@modelcontextprotocol/sdk ^1.29.0`.

## Quick Start

```ts
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { mcpPlugin } from '@runa-cmd/mcp';

const deploy = defineCommand({
  meta: { name: 'deploy', description: 'Deploy a service' },
  args: { service: z.string().describe('Service name') },
  options: { env: z.enum(['staging', 'production']).describe('Target') },
  output: z.object({ url: z.string(), status: z.string() }),
  async run({ args, options }) {
    return {
      url: `https://${options.env}.example.com/${args.service}`,
      status: 'deployed',
    };
  },
});

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0' },
  commands: { deploy },
  plugins: [mcpPlugin()],
});

cli.run();
```

```bash
# Normal CLI usage
$ my-tool deploy api --env staging

# MCP server mode — for AI agents (Claude, Cursor, etc.)
$ my-tool --mcp
```

When `--mcp` is passed, the CLI starts a stdio-based MCP server instead of normal execution. AI agents can then discover and call your commands as tools.

For a CLI made of one command, use `runCLI(deploy, { plugins: [mcpPlugin()] })`.

## How It Works

1. The plugin adds a `--mcp` global boolean flag
2. On `onGlobalFlags` hook, if `--mcp` is true:
   - Maps each leaf command to an MCP tool
   - Checks that it can run itself
   - Serves over stdio until the client disconnects
3. Each tool call runs your CLI again, as a child process

A tool is the same command a person runs: env vars, config files, global options, hooks and middleware all apply, and a `process.exit` only ends that call. To tell tool calls apart in a hook, read `ctx.invocation.surface`. Each call is a new process, so nothing is shared between calls.

### Command → Tool Mapping

| CLI Command | MCP Tool Name | Why |
|---|---|---|
| `deploy` | `deploy` | Direct mapping |
| `config get` | `config_get` | Nested commands join with `_` |
| `db migrate` | `db_migrate` | Same pattern |

### Schema Mapping

Args and options merge into a single MCP `inputSchema`:

```
CLI: deploy <service> --env staging
MCP: { "service": "api", "env": "staging" }
```

Each key goes to its arg or option by name, so arrays, objects and numbers arrive as they are, and a value can never select another command.

### Output Handling

| Scenario | MCP Response |
|---|---|
| Command has `output` schema | `structuredContent` with typed data |
| Command returns a string (no output schema) | `text` content |
| Command returns an object (no output schema) | `text` content (JSON stringified) |
| Command returns nothing | `text` with what it printed, or `Command '<name>' executed successfully.` |
| Command throws | `isError: true` with error message |
| Command never finished | `isError: true` with `Command '<name>' did not finish.` |

A returned value wins over what the command printed.

## What the Operator Decides

Whoever starts the server beats the model. An option with a value from an env var or the config file leaves the tool's schema, and if a model sends it anyway, it's dropped.

```ts
mcpPlugin({
  tools: {
    deploy: {
      expose: ['region'],    // The model can choose it, even if env gives it a value
      serverOnly: ['token'], // Without a value, the server won't start
    },
  },
});
```

Fixed values of 8 characters or more, and the global options the server started with, are redacted from the stdout and stderr returned to the model. What `run()` returns is left as it is, so don't return secrets.

## Current Limitations

These matter when you expose a real CLI to an agent:

- **Every command becomes a tool.** There's no way yet to exclude one or mark it as destructive, so don't enable `--mcp` on a CLI whose commands an agent shouldn't run.
- **Cancelling a call ends the process** without running `cleanup`, and a process the command started keeps running.
- **Tool output has no size limit.**
- **stdio is the only transport.**

The [backlog](https://github.com/jrodrigopuca/runa-cmd/blob/main/docs/backlog.md) tracks the fixes.

## API

### `mcpPlugin(options?)`

Creates the MCP plugin. Returns a `PluginConfig` compatible with `defineCLI`.

```ts
import { mcpPlugin } from '@runa-cmd/mcp';

mcpPlugin({
  name: 'my-server',          // MCP server name (defaults to CLI name)
  version: '2.0.0',           // MCP server version (defaults to CLI version)
  instructions: 'Use deploy before running tests', // Cross-tool workflow hints for AI
  selfCommand: ['/usr/local/bin/my-tool'], // How to run the CLI again, if the startup check fails
});
```

### `McpPluginOptions`

```ts
interface McpPluginOptions {
  name?: string;          // Server name override
  version?: string;       // Server version override
  instructions?: string;  // Workflow instructions for AI agents
  selfCommand?: string[]; // Executable and arguments to run this CLI again
  tools?: Record<string, ToolOptions>; // Per-tool settings, by tool name
}

interface ToolOptions {
  expose?: string[];     // Options the model can set, even if they have a value
  serverOnly?: string[]; // Options that must come from env or config
}
```

## With Help Plugin

MCP and help work together — just add both:

```ts
import { helpPlugin } from '@runa-cmd/help';
import { mcpPlugin } from '@runa-cmd/mcp';

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0' },
  commands: { deploy, init },
  plugins: [helpPlugin(), mcpPlugin()],
});
```

```bash
$ my-tool --help   # Human-readable help
$ my-tool --mcp    # Machine-readable MCP server
```

## MCP Server Details

- **Transport**: stdio (stdin/stdout JSON-RPC)
- **Graceful shutdown**: Handles SIGINT and SIGTERM
- **SDK**: Uses `@modelcontextprotocol/sdk` v1.29+ with `McpServer` API
- **Zod v4 native**: Zod v4 implements [Standard Schema](https://github.com/standard-schema/standard-schema), so schemas pass directly to `registerTool()` — no conversion layer

### Testing with MCP Inspector

You can test your MCP server with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector my-tool --mcp
```

### Configuring in Claude Desktop

Add to your Claude Desktop MCP config (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-tool": {
      "command": "node",
      "args": ["path/to/my-tool.js", "--mcp"]
    }
  }
}
```

## Architecture

```
mcpPlugin()
    │
    ├── plugin.ts     Runa plugin (adds --mcp flag, orchestrates lifecycle)
    ├── schema.ts     Builds tool registrations from command tree
    ├── server.ts     Creates MCP server, registers tools, handles execution
    └── types.ts      McpPluginOptions interface
```

The package has a single runtime dependency (`@modelcontextprotocol/sdk`) and delegates everything else to `@runa-cmd/core`.

## License

MIT
