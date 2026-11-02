---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

`format` now receives the args and options, as `format(result, { args, options })`, with their types. An option that only changes the display, like `--no-truncate`, no longer has to travel in what `run()` returns, where a model and `--json` would get it too. `format(result)` keeps working.
