# @runa-cmd/completions

Auto-generate shell completion scripts for any Runa CLI. One command, three shells — bash, zsh, and fish.

Your Zod schema is the source of truth: enum values become completion candidates, commands and subcommands get tab-completed, and option flags (including `--no-*` booleans) work out of the box.

## Install

```bash
pnpm add @runa-cmd/completions
```

> Peer dependencies: `@runa-cmd/core` and `zod ^4.0.0`.
> Zero runtime dependencies.

## Quick Start

```ts
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { completionsPlugin } from '@runa-cmd/completions';

const deploy = defineCommand({
  meta: { name: 'deploy', description: 'Deploy a service' },
  options: {
    env: z.enum(['staging', 'production']).describe('Target environment'),
  },
  run({ options }) {
    console.log(`Deploying to ${options.env}...`);
  },
});

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0' },
  commands: { deploy },
  plugins: [completionsPlugin()],
});

cli.run();
```

```bash
# Generate and install bash completions
$ my-tool completions bash > ~/.local/share/bash-completion/completions/my-tool

# Or get install instructions
$ my-tool completions bash --instructions

# Tab-complete in action
$ my-tool d<TAB>         → deploy
$ my-tool deploy --e<TAB> → --env
$ my-tool deploy --env <TAB> → staging  production
```

## Supported Shells

| Shell | Script Type | Features |
|---|---|---|
| **Bash** | `complete -F` with `compgen` | Commands, subcommands, options, enum values, `--no-*` booleans |
| **Zsh** | `_arguments -C` with state dispatch | Same + grouped option specs with descriptions |
| **Fish** | `complete -c` directives | Same + native condition-based filtering |

## How It Works

1. The plugin registers a `completions` command with `addCommands` capability
2. The command takes a positional `shell` arg (`bash`, `zsh`, or `fish`)
3. On execution, it introspects the CLI schema via `api.getSchema()`
4. A shell-specific generator produces a self-contained completion script
5. The script is written to stdout — pipe it to a file or eval it

### What Gets Completed

| Element | Example | Completed? |
|---|---|---|
| Top-level commands | `my-tool de<TAB>` → `deploy` | ✅ |
| Nested subcommands | `my-tool config g<TAB>` → `get` | ✅ |
| Long options | `my-tool deploy --e<TAB>` → `--env` | ✅ |
| Short aliases | `my-tool deploy -e<TAB>` | ✅ |
| Boolean negation | `my-tool --no-<TAB>` → `--no-color` | ✅ |
| Enum values | `--env <TAB>` → `staging production` | ✅ |
| Command descriptions | Shown in zsh/fish completions | ✅ |

## API

### `completionsPlugin(options?)`

Creates the completions plugin. Returns a `PluginConfig` compatible with `defineCLI`.

```ts
import { completionsPlugin } from '@runa-cmd/completions';

completionsPlugin({
  commandName: 'complete', // Override command name (default: 'completions')
});
```

### `CompletionsPluginOptions`

```ts
interface CompletionsPluginOptions {
  commandName?: string; // Override the command name (default: 'completions')
}
```

### Direct Generator Functions

For advanced use cases (custom output, testing, etc.), the generators are exported directly:

```ts
import {
  generateBashCompletions,
  generateZshCompletions,
  generateFishCompletions,
} from '@runa-cmd/completions';

// schema: CLISchema from api.getSchema()
const bashScript = generateBashCompletions(schema, 'my-tool');
const zshScript = generateZshCompletions(schema, 'my-tool');
const fishScript = generateFishCompletions(schema, 'my-tool');
```

### `getInstallInstructions(shell, binName)`

Returns shell-specific install instructions as a string:

```ts
import { getInstallInstructions } from '@runa-cmd/completions';

console.log(getInstallInstructions('bash', 'my-tool'));
// # Bash completions for my-tool
// #
// # Option 1: Add to your .bashrc (loads on every shell start)
// #   echo 'eval "$(my-tool completions bash)"' >> ~/.bashrc
// ...
```

## Install Instructions by Shell

### Bash

```bash
# Option 1: Source in .bashrc
echo 'eval "$(my-tool completions bash)"' >> ~/.bashrc

# Option 2: Save to bash-completion directory (recommended)
my-tool completions bash > ~/.local/share/bash-completion/completions/my-tool
```

### Zsh

```bash
# Save to a completions directory in your fpath
mkdir -p ~/.zsh/completions
my-tool completions zsh > ~/.zsh/completions/_my-tool

# Add to .zshrc (before compinit):
#   fpath=(~/.zsh/completions $fpath)
#   autoload -Uz compinit && compinit
```

### Fish

```bash
# Save to fish completions directory (auto-loaded)
my-tool completions fish > ~/.config/fish/completions/my-tool.fish
```

## With Other Plugins

Completions work alongside help and MCP — just add all plugins:

```ts
import { helpPlugin } from '@runa-cmd/help';
import { mcpPlugin } from '@runa-cmd/mcp';
import { completionsPlugin } from '@runa-cmd/completions';

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0' },
  commands: { deploy, init },
  plugins: [helpPlugin(), mcpPlugin(), completionsPlugin()],
});
```

```bash
$ my-tool --help              # Human-readable help
$ my-tool --mcp               # MCP server for AI agents
$ my-tool completions bash    # Shell completions script
```

## Shell Escaping

All values (command names, descriptions, enum values) are properly escaped for each shell context:

| Shell | Escaping Strategy |
|---|---|
| Bash | Single-quote context: `'` → `'\''` |
| Zsh | Same as bash |
| Fish | `'` → `\'`, `\` → `\\` |

Descriptions are truncated to 80 characters and newlines are collapsed to spaces.

## Architecture

```
completionsPlugin()
    │
    ├── plugin.ts          Runa plugin (adds completions command)
    ├── generators/
    │   ├── bash.ts        Bash completion script generator
    │   ├── zsh.ts         Zsh completion script generator
    │   ├── fish.ts        Fish completion script generator
    │   └── escape.ts      Shell-specific string escaping
    ├── install.ts         Install instruction templates
    └── types.ts           Shell type and plugin options
```

Zero runtime dependencies. Everything is derived from `CLISchema` at generation time.

## License

MIT
