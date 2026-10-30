---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Cleanup always runs, and no failure exits silently.

- **`cleanup` runs on unhandled errors.** The `cleanup` hook and plugin `cleanup()` used to be skipped because `process.exit` ran first. They now finish, including async ones, before the process exits.
- **Every failure explains itself.** Typed errors (`RunaError` and subclasses) print as written. Any other error prints `Unexpected error in '<command>': <message>` and how to see more. An error without a message prints `'<command>' failed without an error message (<type>)` instead of nothing.
- **`RUNA_DEBUG=1`** adds the stack trace, error code and cause.
- **`ctx.handled` only controls the output.** Marking an error as handled used to exit 0, reporting a failure as success. The run now keeps the error's exit code. A plugin that truly recovered can set `process.exitCode = 0` in `onError`.

**Migration:** if your `onError` sets `ctx.handled = true` and your scripts rely on exit 0, set `process.exitCode = 0` there. If you match the exact text of an unexpected error on stderr, it now has a prefix.
