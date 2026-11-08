---
'@runa-cmd/help': patch
'@runa-cmd/core': patch
---

The help README said a command's own `-h` stops the CLI with `OPTION_COLLISION`, and that `db migrate --help` shows the help of `db`. Neither is true: a command keeps its `-h`, and nested commands get their own help at any depth. The core README now explains what `ctx.rawArgs` holds in each hook, and `ctx.invocation`.
