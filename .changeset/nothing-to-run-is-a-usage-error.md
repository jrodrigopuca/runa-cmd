---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

With nothing to run, a CLI now shows help on stderr and exits with 2, instead of failing with 127. That covers `tool` on a CLI with several commands, and `tool db` on a group. A name that doesn't exist is still a 127, with its suggestion.

Help now uses the same routing as running a command, so what it shows can't differ from what would run. `defineCLI` with a single command shows that command's help, and `--help` and `--version` work even if a required global option is missing.

A process stopped by a signal now exits with 130 or 143 also when the lifecycle ended early, as an MCP server does.

**Migration:** `api.replaceHelp` handlers receive a second argument, the stream to write to. Write there instead of to `process.stdout`.
