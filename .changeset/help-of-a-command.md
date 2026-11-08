---
'@runa-cmd/core': minor
'@runa-cmd/help': patch
---

The help of a command lists its own options first, and the global ones, as `--help`, `--version` or `--mcp`, apart under `GLOBAL OPTIONS`. `OptionSchema` gains an optional `inherited` that marks them, so a custom renderer still gets every option and can tell them apart. With `runCLI` nothing moves: the command is the CLI.

Also:

- A usage error points to the help of its command: `Run 'tool build --help' for usage.`, instead of the CLI's.
- The core help shows the values of a positional enum, as the help plugin does: `target  What to build for (web | node)`.
- `bold()`, `fg()` and the other ANSI helpers of `@runa-cmd/help` say in their docs that they always write codes; `styled()` respects the output.
