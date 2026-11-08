---
'@runa-cmd/core': patch
---

`testCLI()` rejects when given `config` for a CLI that doesn't declare `config` in `defineCLI`, instead of applying the values. The real program would read no file, so the test passed while the CLI didn't work. The message says what to add. For a single command, `config` still stands for the file of `runCLI(command, { config })`.
