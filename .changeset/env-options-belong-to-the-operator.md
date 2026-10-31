---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

An option that declares `env` never reaches an MCP tool's schema, even if the variable isn't set. A forgotten `API_TOKEN` no longer becomes a parameter a model can ask a person for: the call fails with the usual error.

**Migration:** to let the model choose an option that declares `env`, add it to `mcpPlugin({ tools: { deploy: { expose: ['env'] } } })`.
