---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

`--help` and `-h` now work with no plugin: `tool --help` and `tool db migrate --help` show plain help, with the global options that work on that command. Help and completions list `--help`, and `--version` when the CLI has a version. Usage errors always end with `Run '<cli> --help' for usage.`

A command that declares `-h` or `--help` keeps it, and the CLI starts, with or without `@runa-cmd/help`. Each flag yields separately, so `--help` still shows help on a command that took `-h`.

`getSchema()` now includes `help`, and `version` when the CLI has one, in `globalOptions`.

**Migration:** `helpPlugin` no longer registers a `help` global option, so `ctx.globalOptions.help` is gone: a plugin that read it to show its own help now uses `api.replaceHelp(show)`, with the `replaceHelp` capability. `@runa-cmd/help` no longer has `zod` as a peer dependency.
