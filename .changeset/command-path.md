---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Hooks, middleware and `run()` now get the whole path of the command, as `command.path`. `tag add` and `add` both had the name `add`, so a permissions or audit plugin couldn't tell them apart. Middleware also gets `command`, which it didn't have. `command.name` doesn't change.
