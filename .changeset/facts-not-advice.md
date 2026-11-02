---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A failed tool call now says what happened, not what to do. An expected `CommandError` used to tell the model "it may have taken effect. Check before retrying", even in a read-only tool, and `safeToRetry` said nothing about how often or when.

**Breaking:** `_meta['runa/error']` no longer has `safeToRetry`. It keeps `class` and `effect`.

The text only states facts: `The command did not run.`, `The command already ran.` or `The command did not finish.`. A `CommandError` reaches the model as you wrote it, with `effect: "unknown"`.

**Migration:** a client that read `safeToRetry` can read `effect`, where `none` means `run()` never started. To guide a model, say it in your error message. Retrying is up to you and whoever approves the calls: if a command fails partway, a model may run it again, so make that safe.
