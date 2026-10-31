---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Authors now choose what an MCP server exposes. `mcpPlugin({ exclude: ['deploy'] })` removes a tool, so it can't be listed or called. Per tool, `tools: { deploy: { description, annotations } }` replaces what the model reads and passes MCP annotations like `destructiveHint` to the client.

Annotations are hints, not access control: `exclude` is the only real boundary. An unknown name in `exclude`, an excluded tool with settings, or a tool both read-only and destructive stop the server at startup.
