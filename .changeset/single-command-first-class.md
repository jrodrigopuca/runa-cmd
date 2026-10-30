---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A CLI made of one command is now first class, with `--version` and a POSIX `--`.

- **`runCLI(command, options?)` takes plugins,** plus `middleware`, `config`, `globalOptions`, `globalMeta` and `strictOptions`. Help, MCP and completions all work with it.
- **`runCLI` runs in an explicit root mode.** A value equal to the command name is data: `tool tool` passes `"tool"`. A subcommand added by a plugin routes by name, and `--` passes that name as data.
- **`--version` is built in** when `meta.version` is set, in `defineCLI` and `runCLI`. It has no short alias, and a command's own `--version` option wins.
- **`--` fills empty positionals,** as POSIX operands. A variadic counts as one, and what's left goes to `ctx.rest`.
- **`defineCLI` with one command is deprecated** when it routes implicitly. It keeps working and warns once. It will be removed before 1.0.

`CLISchema` gains an optional `root`, and `RunCLIOptions` is exported.

**Migration:**

- `runCLI(cmd, argv)` is now `runCLI(cmd, { argv })`.
- With `exec [target] -- ls -la`, `ls` now fills `target`. Commands that wrap another one should declare no positional for it, or read it from `ctx.rest`.
- With a variadic and nothing before `--`, as in `lint -- --fix`, the token now lands in the variadic instead of `ctx.rest`.
