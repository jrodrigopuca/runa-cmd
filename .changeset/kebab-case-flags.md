---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Option keys in camelCase now become kebab-case flags: `darkColor` is `--dark-color`, and `outputURL` is `--output-url`. `run()`, config files and MCP tools keep the key. A key with hyphens stays as written. Help, errors and completions show the flag, which `getSchema()` exposes in the new `flag` field of each option.

**Breaking:** `--darkColor` no longer works: it's a usage error that points to `--dark-color`. Scripts that use the camelCase form need the new one.

A boolean named `noCache` now stops the CLI at startup, because `--no-cache` already negates `cache`. Two keys that give the same flag do too.

**Migration:** rename a boolean like `noCache: z.boolean().default(false)` to `cache: z.boolean().default(true)`. Code that builds an `OptionSchema` by hand now has to include `flag`.
