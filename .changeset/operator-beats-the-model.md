---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

In MCP, whoever starts the server beats the model.

- **Fixed values leave the tool's schema.** An option with a value from an env var or the config file is hidden, and if a model sends it anyway, it's dropped. A required option that already has a value no longer asks the model for anything.
- **`mcpPlugin({ tools })` adjusts this per tool:** `expose` leaves an option to the model, and `serverOnly` makes the server refuse to start without a value.
- **Fixed values are redacted** from the stdout and stderr returned to the model, when they have 8 characters or more. So are the global options the server started with. What `run()` returns is left as it is.
- **`api.getConfigValues()`** lets a plugin read the config file of the CLI.

**Migration:** an option an agent used to set may disappear from its tool if env or config give it a value. Use `tools.<name>.expose` to keep it.
