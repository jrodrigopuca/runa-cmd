# @runa-cmd/mcp

Turn any Runa CLI into an [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server with a single flag.

Every command becomes an MCP tool. Zod schemas pass directly to the MCP SDK — zero schema conversion needed.

## Install

```bash
pnpm add @runa-cmd/mcp
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

## How It Works

1. The plugin adds a `--mcp` global boolean flag
2. On `onGlobalFlags` hook, if `--mcp` is true:
   - Introspects the CLI schema via `getSchema()`
   - Gets the live command tree via `getCommands()`
   - Maps each leaf command to an MCP tool
   - Starts an MCP server over stdio transport
   - Short-circuits normal CLI execution

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

The plugin tracks which keys are args vs options internally, so it can reconstruct the proper `RunContext` when executing the command.

### Output Handling

| Scenario | MCP Response |
|---|---|
| Command has `output` schema | `structuredContent` with typed data |
| Command returns a string (no output schema) | `text` content |
| Command returns an object (no output schema) | `text` content (JSON stringified) |
| Command returns void | `text: "ok"` |
| Command throws | `isError: true` with error message |

## API

### `mcpPlugin(options?)`

Creates the MCP plugin. Returns a `PluginConfig` compatible with `defineCLI`.

```ts
import { mcpPlugin } from '@runa-cmd/mcp';

mcpPlugin({
  name: 'my-server',          // MCP server name (defaults to CLI name)
  version: '2.0.0',           // MCP server version (defaults to CLI version)
  instructions: 'Use deploy before running tests', // Cross-tool workflow hints for AI
});
```

### `McpPluginOptions`

```ts
interface McpPluginOptions {
  name?: string;          // Server name override
  version?: string;       // Server version override
  instructions?: string;  // Workflow instructions for AI agents
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
