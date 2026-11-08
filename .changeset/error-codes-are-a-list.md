---
'@runa-cmd/core': minor
'@runa-cmd/mcp': minor
---

Error codes are now a list you can import. `ERROR_CODES` from `@runa-cmd/core` has every code core throws, and the README says when each one comes up. `isRunaError(error, code?)` tells if something is a `RunaError` with that code, and works even when two copies of `@runa-cmd/core` are installed, where `instanceof` fails. It takes your own codes too, as a `CommandError`'s:

```ts
if (isRunaError(error, ERROR_CODES.INVALID_CONFIG)) { /* the config file is wrong */ }
if (isRunaError(error, 'DEPLOY_FAILED')) { /* your own code */ }
```

`@runa-cmd/mcp` exports `ERROR_CLASSES`, the `class` values of a failed call, and `MCP_ERROR_CODES`, its own startup codes. Its README lists each class with its `effect`.

**Breaking:** three codes are renamed, before they're fixed for 1.0.

| Before | Now |
|---|---|
| `CONFIG_INVALID` (a `ConfigError`) | `INVALID_CONFIG` |
| `OPTION_NAME`, when two keys give the same flag | `OPTION_COLLISION`, as with globals |
| `OPTION_NAME`, when a boolean `noCache` clashes with `--no-cache` | `INVALID_OPTION_NAME` |

**Migration:** compare against the new names, or against `ERROR_CODES`. Messages and exit codes don't change.
