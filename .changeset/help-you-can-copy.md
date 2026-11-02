---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

The help of a command can now be copied and run. It used to show `USAGE  deploy [options]`, without the CLI: now it's `tool deploy [options]`, in the built-in help and in the plugin. A variadic shows its dots, as in `<files...>`.

`styled()` and the help plugin no longer write escape codes to a pipe or with `NO_COLOR`. Colors were left out, but bold, dim, italic and underline weren't, so `tool --help > file` or `| less` got raw codes. Padding stays: it's layout.

`detectColorDepth(stream)` takes the stream to ask about, and the plugin asks about the one it writes to, which is stderr when there was nothing to run.

`CommandSchema.commandLine` says what a person types to run a command. It's set for help: `fullPath` doesn't change.
