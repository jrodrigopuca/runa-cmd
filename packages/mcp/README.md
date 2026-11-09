# @runa-cmd/mcp

Turn any Runa CLI into an [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server with a single flag.

Every command becomes an MCP tool. Zod schemas pass directly to the MCP SDK — zero schema conversion needed.

## Install

```bash
pnpm add @runa-cmd/mcp@beta
```

> Peer dependencies: `@runa-cmd/core` and `zod ^4.0.0`.
> Runtime dependency: `@modelcontextprotocol/sdk ^1.32.2`.
>
> **New to it?** [Your CLI as an agent's tools](https://github.com/jrodrigopuca/runa-cmd/blob/main/guides/mcp.md) builds a CLI for agents step by step, and tests it as a client does.

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
| `with-output` | `with-output` | A command keeps its name |
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
| Command fails | `isError: true`, with the reason in the text, plus `_meta['runa/error']` |

A returned value wins over what the command printed. The `format` of a command is for people: it doesn't run for a tool, and `--json` isn't a parameter.

### Errors

A failed call says what happened, not what to do next. `_meta['runa/error']` tells the client, as `{ class, effect }`, and the text tells the model:

| `effect` | Meaning | Text added |
|---|---|---|
| `none` | `run()` never started | `The command did not run.` |
| `unknown` | `run()` started and did not return | `The command did not finish.` |
| `completed` | `run()` returned, and something failed after it, like an invalid `output` | `The command already ran.` |

A `CommandError` is the exception: the model reads your message as you wrote it, with `effect: "unknown"`, because only you know what the command did. To guide the model, say it there: `throw new CommandError('The proxy is off. Start it first.')`.

The `class` says what failed. Each one is part of the [contract](../../VERSIONING.md), and `ERROR_CLASSES` lists them:

| `class` | `effect` | When |
|---|---|---|
| `unknown_tool` | `none` | No tool has that name, or it's excluded |
| `invalid_input` | `none` | An argument or option the model sent is missing or breaks its schema |
| `not_configured` | `none` | A value only the operator gives is missing, as an option's env var, or breaks its schema, in env or in the config file. The model can't send it nor fix it, so the text says what the operator has to set or fix |
| `rejected` | `none` | The call failed before `run()`, as in a hook or a middleware |
| `not_run` | `none` | The call ended well without running the command, because a hook or a middleware skipped it |
| `command_failed` | `unknown` | `run()` threw a `CommandError`: the failure you wrote, with your message as is |
| `crashed` | `none` or `unknown` | `run()` threw any other error, as a plain `Error`: a bug, not a failure you foresaw. Also when the process ends without saying why |
| `invalid_output` | `completed` | `run()` returned a value its `output` schema rejects |
| `output_too_large` | `completed` | The result is over `maxOutput` |
| `after_run_failed` | `completed` | Something failed after `run()` returned, as an `afterRun` hook |
| `cancelled` | `unknown` | The client cancelled the call, or the server closed |

```ts
import { ERROR_CLASSES, type ErrorClass } from '@runa-cmd/mcp';

const retryable = (found: ErrorClass) => found === ERROR_CLASSES.CANCELLED;
```

These stop the server at startup, with exit 1, and `MCP_ERROR_CODES` lists them. The rest of the codes are [core's](../core/README.md#error-codes):

| Code | When |
|---|---|
| `MCP_INVALID_TOOLS` | The tool settings can't be met: `exclude` or `tools` names a tool or option that doesn't exist, an excluded tool has settings, a tool is read-only and destructive, an option is exposed and server-only, a `maxOutput` isn't a positive number, or a server-only option has no value |
| `MCP_SELF_CHECK_FAILED` | The CLI can't start itself as a subprocess, as a compiled binary without `selfCommand` |

**Retrying is up to you and whoever approves the calls.** Runa knows how far a command got, not whether repeating it is a good idea. If a command fails partway, a model only sees `unknown` and may run it again, so make that safe, or say so in your message.

### Cancellation

Cancelling a call, or closing the server, aborts `ctx.signal` in the command and runs `cleanup`. A command that ignores it stops being waited for after 2 seconds, and its whole process tree ends after 5. Pass `signal` to whatever the command starts:

```ts
async run({ signal }) {
  await fetch(url, { signal });
}
```

### Output Limit

A tool answers with up to 100 KiB, or what `maxOutput` says. Longer output keeps its start and its end, with a notice in between. A returned value isn't cut: a broken JSON helps nobody, so the call fails with `output_too_large` and reports that the command already ran.

## What You Expose

Every command is a tool by default. Choose what an agent gets, and how it reads about it:

```ts
mcpPlugin({
  exclude: ['internal', 'config_reset'],
  tools: {
    status: { annotations: { readOnlyHint: true } },
    deploy: {
      description: 'Deploy to production. Ask before running it.',
      annotations: { destructiveHint: true },
    },
  },
});
```

- **`exclude`** removes the tool: it isn't listed and can't be called. This is the only real boundary.
- **`tool: false`** on a command does the same from its definition, for commands that only make sense at a terminal. `completions` has it, so you don't need to exclude it.
- **`annotations`** go to the client as the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/schema#toolannotations) defines them. **They are hints, not access control:** a client decides what to do with them, and may ignore them. Without them, clients assume a tool can be destructive.
- **`description`** replaces what the model reads, without changing your CLI's help.

An unknown name in `exclude`, an excluded tool with settings, or a tool both read-only and destructive stop the server at startup.

## What the Operator Decides

Whoever starts the server beats the model. An option that declares `env`, or has a value for that command in the config file, stays out of the tool's schema. If a model sends it anyway, the call fails with `class: "invalid_input"` and nothing runs: `'replicas' is set by the operator of this server, so it can't be sent.` The text never shows the operator's value. To let the model choose, list the option in `expose`. This holds even if the env var isn't set: a missing required value fails the call with `class: "not_configured"`, and its text tells the model that the operator has to set it, so it doesn't take it as its own mistake. The server also says it at startup, on stderr, which clients show in their logs: `mcpPlugin: tool 'deploy' can't run until the operator sets DEPLOY_TOKEN (--token).` It keeps serving, because the other tools work.

A value the operator gave that breaks its schema works the same way, checked with the rules the CLI uses, so `"5"` for a number is fine. The call fails with `not_configured`, and the server says at startup what to fix, without the value: `mcpPlugin: tool 'deploy' can't run until the operator fixes DEPLOY_ENV (--env): expected one of: staging, production.`, or `fixes 'deploy.replicas' in the config file: expected number.`

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

**Secrets belong in `env`.** Redaction is a safety net, not a barrier: it matches exact text, so it won't catch a value that was transformed, as with base64, and a command can always leak what it receives. Don't expose a command an agent shouldn't run.

## Current Limitations

These matter when you expose a real CLI to an agent:

- **A new command becomes a tool unless you exclude it.** Review `exclude` when you add one.
- **Ending processes is best-effort.** One that created its own process group or session escapes.
- **Only a direct Node `selfCommand` gets the stop notice.** A compiled binary or a wrapper like `npx` is ended by the deadline, and not at all if the server is killed with `SIGKILL`.
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
  exclude?: string[];     // Tools that won't exist for an agent
  maxOutput?: number;     // Most bytes a tool can answer with. Default: 100 KiB
  tools?: Record<string, ToolOptions>; // Per-tool settings, by tool name
}

interface ToolOptions {
  description?: string;  // What the model reads, instead of the command's description
  annotations?: ToolAnnotations; // Hints for the client, as MCP defines them
  expose?: string[];     // Options the model can set, even if they declare env
  serverOnly?: string[]; // Options that must come from env or config
  maxOutput?: number;    // This tool's limit, instead of the plugin's
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
- **SDK**: Uses `@modelcontextprotocol/sdk` v1.32+ with `McpServer` API
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
