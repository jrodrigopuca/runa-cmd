---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Stopping a run now reaches everything it started. `run()` and hooks receive `signal`, an `AbortSignal` that fires on `SIGINT`, `SIGTERM` or a cancelled tool. `cleanup` runs in all those cases, and a CLI exits with 130 or 143.

**Behavior change:** Ctrl+C no longer ends a CLI at once. A command that ignores `signal` stops being waited for after 2 seconds, the process ends after 5 at most, and a second Ctrl+C leaves at once. A command that blocks the event loop can't react until it yields: `Ctrl+\` still ends it.

**Migration:** code that builds a `RunContext` or a `HookContext` by hand, as in unit tests, now has to include `signal`.

In MCP, cancelling a call or closing the server ends the child and what it started, and a child stops by itself if the server dies. Tool output is limited to 100 KiB by default: longer output keeps its start and end with a notice, and `maxOutput` changes the limit globally or per tool. A returned value over the limit fails with `output_too_large`.
