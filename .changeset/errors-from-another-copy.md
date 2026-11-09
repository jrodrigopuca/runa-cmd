---
'@runa-cmd/core': minor
---

An error from another copy of `@runa-cmd/core`, as one a plugin brings, ends as one of ours. A `CommandError` keeps its exit code and its message, at the terminal and through MCP, and a `ValidationError` is a usage error. `isRunaError` already recognized them, but the exit code and the message were decided by `instanceof`.

**Breaking:** a `CommandError` with exit code 3 from another copy used to come out as `Unexpected error in 'boom': …` with exit 1. It now exits with 3 and its message as written, as the docs always said.
