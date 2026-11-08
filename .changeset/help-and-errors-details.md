---
'@runa-cmd/core': patch
'@runa-cmd/help': patch
'@runa-cmd/completions': patch
---

Help and errors without noise:

- A boolean whose default is `true` shows as `--[no-]cache`, so people see how to turn it off.
- An empty list as a default no longer shows `(default: )`.
- A value that breaks a rule of its schema names the flag in plain words: `Invalid value for --limit: must be greater than 0`, instead of `limit: Too small: expected number to be >0`.
- Shell completions offer `--no-x` only for a boolean that starts on: `--no-help`, `--no-version` and `--no-mcp` are gone.
- The custom renderer example of the help README compiles, and handles the help of a command too.
