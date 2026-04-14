# Runa Demo CLI

A realistic deployment tool that showcases every feature of the [Runa](../../README.md) framework.

## What's Inside

| Feature | Where |
|---|---|
| Multi-command CLI | `src/cli.ts` — 5 commands + nested subcommands |
| Positional args | `deploy <service>`, `init [name]`, `config get <key>` |
| Variadic args | `config set <key> <values...>` |
| Enum options | `--env staging\|production\|preview` |
| Option groups | Deploy / Safety / Filter / Output |
| Option aliases | `-e`, `-f`, `-r`, `-t`, `-n` |
| Env var binding | `DEPLOY_ENV` → `--env` |
| Deprecated options | `--force` → "Use --confirm instead" |
| Typed output schemas | `deploy` and `config` commands validate return values |
| Middleware | Timer middleware with onion model (`src/middleware.ts`) |
| Global options | `--verbose` / `-V` |
| Help plugin | `--help` / `-h` with themed output |
| MCP plugin | `--mcp` starts a Model Context Protocol server |
| Completions plugin | `completions bash\|zsh\|fish` |
| Config file loading | Reads `runa-demo.config.json` |

## Quick Start

```bash
# From the monorepo root
pnpm install

# Build all packages (required before first run)
pnpm build

# Run the demo
pnpm demo --help
```

## Usage

All commands are run from the **monorepo root** using the `pnpm demo` script:

```bash
pnpm demo <command> [args] [options]
```

> **Note:** Don't use `--` between `demo` and the command. Just pass args directly.

### Deploy a service

```bash
# Deploy to staging (default)
pnpm demo deploy api

# Deploy to production with 3 replicas
pnpm demo deploy api --env production --replicas 3

# Dry run — see what would happen
pnpm demo deploy api --dryRun

# Use short aliases
pnpm demo deploy api -e preview -r 2 -t v1.2.3

# Verbose mode (shows execution time)
pnpm demo --verbose deploy api
```

### Initialize a project

```bash
# Init in current directory
pnpm demo init

# Init in a specific directory
pnpm demo init my-project
```

### View logs

```bash
# View logs for a service
pnpm demo logs api

# Follow logs in production, last 3 lines
pnpm demo logs api -e production -f -n 3

# Filter by time
pnpm demo logs api --since 1h
```

### Manage configuration

```bash
# List all config (grouped by prefix)
pnpm demo config list

# List as JSON
pnpm demo config list --json

# Get a specific key
pnpm demo config get deploy.env

# Set a value
pnpm demo config set deploy.region eu-west-1

# Set multiple values (variadic)
pnpm demo config set tags frontend api worker
```

### Shell completions

```bash
# Generate bash completions
pnpm demo completions bash

# Generate zsh completions
pnpm demo completions zsh

# Get install instructions
pnpm demo completions bash --instructions
```

### Help

```bash
# Global help
pnpm demo --help

# Command-specific help
pnpm demo deploy --help
pnpm demo logs --help
pnpm demo config list --help
```

### MCP Server

```bash
# Start as MCP server (Model Context Protocol)
pnpm demo --mcp
```

## Development Workflow

For active development, use watch mode so `dist/` stays in sync:

```bash
# Terminal 1 — watch builds (keep running)
pnpm dev

# Terminal 2 — test commands
pnpm demo deploy api --env staging
```

The `pnpm dev` command runs `tsc --watch` in parallel for all packages. When you edit any `.ts` file in `packages/`, the corresponding `dist/` is rebuilt automatically (~100ms).

## Project Structure

```
examples/demo/
├── src/
│   ├── cli.ts              # Entry point — defineCLI with all config
│   ├── ui.ts               # ANSI styling helpers (zero deps)
│   ├── middleware.ts        # Timer middleware (onion model)
│   └── commands/
│       ├── deploy.ts        # Enum opts, groups, output schema
│       ├── init.ts          # Simple positional with default
│       ├── logs.ts          # Multiple option groups, env var
│       └── config.ts        # Nested subcommands, variadic args
├── package.json
└── tsconfig.json
```

## Features by Command

### `deploy`
Shows how to build a real deployment command with grouped options (Deploy / Safety), enum environments, env var binding (`DEPLOY_ENV`), deprecated options, and typed output that gets validated by Zod.

### `init`
The simplest possible command — one optional positional arg with a default value.

### `logs`
Demonstrates multiple option groups (Filter / Output), number options, boolean flags, and short aliases like `-f` and `-n`.

### `config get/set/list`
Nested subcommands under a `config` namespace. Shows variadic args (`config set key val1 val2`), JSON output mode, and typed output schemas.
