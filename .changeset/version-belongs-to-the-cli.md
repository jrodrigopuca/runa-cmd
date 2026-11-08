---
'@runa-cmd/core': minor
---

A command of `defineCLI` with `meta.version` stops the CLI at startup, with `INVALID_COMMAND_VERSION`:

```
Command 'deploy' declares meta.version: 'version' only applies with runCLI; set it in defineCLI's meta.
```

There it did nothing, without a word: `--version` prints the CLI's version, from `defineCLI`'s `meta`. On the command of `runCLI`, which is the CLI, it still works as before.

**Breaking:** a CLI with a command like that doesn't start until the version moves to `defineCLI`'s `meta`.
