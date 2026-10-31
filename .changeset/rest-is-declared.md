---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

What's left after `--` is now a usage error, unless the command asks for it. `tool a -- b` used to ignore `b` with exit 0, so data got lost in silence. `--` still fills empty positionals.

**Breaking:** a command that reads `ctx.rest` has to declare `rest: true`. Without it, `ctx.rest` is empty and the extra tokens exit with 2 and `Unexpected positional argument`.

**Migration:** add `rest: true` to commands that wrap another program. If you validated `ctx.rest` by hand to reject extras, delete that code.

`meta.options.<key>.valueName` names the value in help: `valueName: 'hex'` shows `--color <hex>` instead of `--color <string>`. It works in the built-in help and in `@runa-cmd/help`.

Clearer errors for mistyped flags:

- `--no-color` on an unknown option now says `Unknown option: --no-color`, not `--color`.
- `--no-style` on an option that takes a value now says it can't be negated.
- A typo in `--help` or `--version` gets a suggestion, and so does `-V`, which points to `--version`.
