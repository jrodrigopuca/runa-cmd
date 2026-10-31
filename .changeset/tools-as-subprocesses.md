---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

MCP tools now run as a child process of your own CLI, so a tool is the same command a person runs.

- **The whole lifecycle applies:** env vars, config files, startup global options, hooks and middleware. A middleware can reject a call.
- **Commands can print.** What they write no longer reaches the protocol. A returned value is the result, and without one, stdout is.
- **Calls are isolated.** Simultaneous calls don't mix, and a `process.exit` in a command only ends that call.
- **No false success.** If a command never finished, as when a middleware skips it, the tool returns an error.
- **Any input travels intact,** including arrays, objects and large values, and validation runs once, in the same place as the CLI.
- **`cleanup` runs when the server closes,** not before the first call.
- **The server checks at startup that it can run itself.** `mcpPlugin({ selfCommand })` sets how, if the check fails.

**Migration:** each call is a new process, so don't count on state shared between calls. A call now takes about 140 ms in a minimal CLI, plus whatever your CLI takes to start. `exports` of `@runa-cmd/core` gains `./internal`, which is not public API.
