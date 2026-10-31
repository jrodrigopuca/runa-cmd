---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A failed MCP tool call now says what happened to the command's effects, so a model doesn't repeat what already ran. The text ends with that sentence, and `_meta['runa/error']` carries `{ class, effect, safeToRetry }`, where `effect` is `none`, `unknown` or `completed`. A command that fails partway reports `unknown`, and an invalid `output` reports that the command already ran.

Tool errors no longer include hints for people, like `RUNA_DEBUG` or `--help`, unless the operator sets `RUNA_DEBUG`. A call whose `run()` finished is now an error if the process exits with an error afterwards, and a skipped command reads `did not run` instead of `did not finish`.
