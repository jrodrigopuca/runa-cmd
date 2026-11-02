---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

`tool: false` keeps a command out of the MCP server, from its definition. It's for commands that only make sense at a terminal.

**Breaking:** `completions` is no longer a tool. A shell script means nothing to a model, and it took an `exclude` to hide it. An `exclude` that names it stays valid, and settings for it in `tools` now fail at startup.
