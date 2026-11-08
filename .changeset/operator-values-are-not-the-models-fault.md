---
'@runa-cmd/core': minor
'@runa-cmd/mcp': minor
---

A tool call that's missing a value only the operator gives, as an option's env var, now fails with `class: "not_configured"`, not `invalid_input`. Its text starts with `The operator of this server has to set NOTES_FILE. It isn't a value you can send.`, so a model doesn't take it as its own mistake, nor ask the user for it. The server also says it at startup, on stderr, one line per tool, and keeps serving:

```
mcpPlugin: tool 'add' can't run until the operator sets NOTES_FILE (--file).
```

An input error the model can fix names the key it sent, as `Invalid value for 'limit': must be greater than 0`, instead of `--limit`, a flag it never saw. The line about an operator's value still names the flag and the variable, for whoever runs the server.

**Breaking:** a plain `Error` thrown from `run()` is now `class: "crashed"`, with `The command did not finish.`, instead of `command_failed`. Only a `CommandError` is `command_failed`, with its message as you wrote it. A client can now tell a failure you foresaw from a bug, as the README always said.

**Migration:** to have the model read your message as is, throw a `CommandError`.
