---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

`testCLI()`, from `@runa-cmd/core/testing`, runs a CLI or a command through its real lifecycle without ending the process. A failing command used to kill the test runner, and capturing its output took a page of patches.

It returns the exit code, stdout, stderr, what `run()` returned, the original error, and a `trace` of what happened: where each value came from, which hooks ran and for how long, and everything written, in order. It takes `env` and `config` instead of reading the machine, and several runs can share a process without mixing their output, with `node --test` and with Vitest. A value from env stays out of `trace`, because it can be a secret.

`RUNA_DEBUG=1` now shows those steps on stderr while they happen. It never prints a value.
