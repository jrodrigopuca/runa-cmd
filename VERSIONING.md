# Versioning Policy

Runa follows [Semantic Versioning](https://semver.org/) from `1.0.0`. This page declares what its public API is, so you can tell what a new version may break.

**Before 1.0**, any `0.x` or beta release can break things. Each one says how to migrate in its changelog.

## What is covered

A change here needs a major version.

| Area | What you can rely on |
|---|---|
| Exports | Everything exported from `@runa-cmd/core`, `@runa-cmd/core/zod`, `@runa-cmd/core/testing`, `@runa-cmd/help`, `@runa-cmd/mcp` and `@runa-cmd/completions` |
| Project generator | `npm create @runa-cmd <name>`: its arguments and exit codes. The files it creates follow the getting started guide, and change with it |
| Exit codes | `0` success, `1` failure, `2` usage error, `127` command not found, `130` `SIGINT`, `143` `SIGTERM`, and the case each one covers. On Unix, `130` and `143` are what the shell shows for a process that died by that signal: Runa ends by the signal itself, so `spawn` reports `signal`, not `code` (ADR-0046) |
| Streams | Results go to stdout. Errors, warnings and the help of a run with nothing to do go to stderr |
| Error codes | The `code` of each `RunaError`, listed in `ERROR_CODES` and in the READMEs of [`core`](./packages/core/README.md#error-codes) and [`mcp`](./packages/mcp/README.md#errors): use it, not the message, to tell errors apart |
| Flags | How a key becomes a flag: `darkColor` is `--dark-color` |
| Values | The order CLI, env, config and default, and the accepted forms of booleans and lists |
| Config file | Its shape: where a global and a command's option go, and that an unknown key is an error |
| Lifecycle | The order of hooks, and when each one runs |
| `getSchema()` | The meaning of its fields |
| MCP tools | Tool names, input keys, and the `class` and `effect` keys of `_meta['runa/error']` |
| Platform | The minimum Node version, and the Zod major |

## Types

The rule depends on who builds the value.

| Kind of type | Examples | In a minor version |
|---|---|---|
| You build it | `CommandConfig`, `OptionMeta`, `PluginConfig`, `McpPluginOptions` | Can gain **optional** fields only |
| Runa hands it to you | `RunContext`, `HookContext`, `CLISchema`, `OptionSchema` | Can gain any field |

If you build a type of the second kind by hand, as in a test, a minor version can require a new field.

## What is not covered

These can change in any minor version, and are listed in the changelog.

| Area | Instead |
|---|---|
| Text of errors and warnings | Match the exit code or the `code` |
| Text and layout of help | Read `getSchema()` |
| Text of MCP tool results | Read `_meta['runa/error']`. A client should tolerate a `class` it doesn't know |
| Generated completion scripts | What they complete stays, not how they're written |
| The `trace` of `testCLI()` and the output of `RUNA_DEBUG` | Assert on the exit code, the output and the result |
| Default limits and deadlines | The 2 and 5 seconds to stop, and the 100 KiB of tool output, can be tuned. Set `maxOutput` if you depend on it |
| `@runa-cmd/core/internal` | Not for you: it can change in any release |
| Anything undocumented | Open an issue if you need it covered |

New exports, options, error codes and `class` values are also minor changes.

**Fixes:** behavior that contradicts the documentation is a bug, and fixing it isn't a breaking change, even if something came to depend on it.

**Security:** a fix for a vulnerability can break something in a minor version, when there's no compatible way to do it. The changelog will say so.

## Deprecation

1. A minor version marks it as deprecated, in the changelog and the docs, with what to use instead.
2. Using it emits a Node deprecation warning once per run, with a `RUNA_` code, to stderr. That never changes the exit code.
3. A later major version removes it, at least **3 months** after the first minor that announced it, and with a migration note.

## Support

Fixes land on the latest major version only. Runa has one maintainer: this is what can be promised honestly.

The packages `@runa-cmd/help`, `@runa-cmd/mcp` and `@runa-cmd/completions` declare the lowest `@runa-cmd/core` they work with, so npm refuses an older one at install time.
