---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A command now has one name, its key, written the same way everywhere. `meta.name` used to be required and do nothing in `defineCLI`: `commands: { withOutput }` ran as `withOutput`, whatever `meta.name` said.

**Breaking:** a key only takes lowercase letters, numbers and dashes, and anything else fails at startup with `INVALID_COMMAND_NAME`, saying the right form. `meta.name` has to match the key if you write it. An MCP tool takes the name of its command, so a renamed command is a renamed tool.

**Migration:** rename the keys that don't fit.

```ts
// Before
commands: { withOutput }

// After
commands: { 'with-output': withOutput }
```

`meta.name` is now optional in `defineCLI`, and `run()` and hooks still get `command.name`. `runCLI` requires it, because it names the CLI.

Options don't change: `run()` reads them by key, so `darkColor` is still `--dark-color`.
