# @runa-cmd/mcp

## 0.2.0-beta.0

### Minor Changes

- 5f03fdf: Production hardening for the first beta. Five behavior changes, one platform change, and a set of additive APIs. Read the migration notes — two of the changes can turn previously-silent misbehavior into hard errors.

  **Behavior changes (migration guidance included)**

  1. **Unknown options are now rejected (exit 2)** — previously a typo'd flag (`--forse`) was silently ignored. Parsing now fails with `Unknown option: --forse` plus a did-you-mean suggestion when a defined flag is within edit distance 3. Escape hatch: `defineCLI({ ..., strictOptions: false })` restores the old lenient behavior one line at a time while you fix call sites.

  2. **Empty-string values for number options are now rejected (exit 2)** — previously `--port ""`, an empty env var, or an empty config value coerced to `0` (`Number('') === 0`). All three resolution sources (CLI arg, env var, config file) now fail with `Invalid value for --port: expected number`. No escape hatch: the old behavior fabricated data. A legitimate `0` (e.g. `--port 0` or a config number `0`) still passes.

  3. **`helpPlugin()` no longer calls `process.exit(0)`** — after rendering help it short-circuits the lifecycle and lets the process exit naturally with code 0. Terminal users see no difference; embedders (tests, MCP hosts, programmatic `cli.run()` callers) now get the promise resolved and cleanup hooks always run. Restore the old forced exit with `helpPlugin({ exitOnHelp: true })`.

  4. **Tokens after `--` are no longer positionals** — everything after the first standalone `--` is delivered verbatim in the new `ctx.rest: string[]` (empty array when no `--` is present), unvalidated and exempt from strict option checking. Global flags after `--` are no longer intercepted (`mycli exec -- --help` runs `exec` instead of rendering help). CLIs that accidentally relied on post-`--` tokens filling schema-validated positionals must drop the `--`.

  5. **Global/command option collisions now throw at startup** — if a plugin-registered (or statically declared) global option's name or alias overlaps any command's option name or alias, `cli.run()` fails fast with a `RunaError` (code `OPTION_COLLISION`, exit 1) naming the option, the plugin, and the command — previously the global extractor silently stole the token. Fix: rename one of the two options or drop the conflicting alias.

  **Platform change**

  6. **Node >= 24 required** — `engines` is now `">=24.0.0"` across all packages. Node 18, 20, and 22 are dropped: 18 and 20 are end-of-life, and the toolchain floor (vitest 4) cannot even test them. CI runs the full suite on Linux and Windows under Node 24.

  **Additive API surface**

  - `ctx.rest: string[]` on `RunContext` — pass-through tokens after `--`.
  - `CLIConfig.strictOptions?: boolean` (default `true`) — the rollback hatch for change 1.
  - `HelpPluginOptions.exitOnHelp?: boolean` (default `false`) — the rollback hatch for change 3.
  - `SchemaAdapter` / `SchemaDescription` exported as types from `@runa-cmd/core` — Zod v4 introspection is now confined behind an adapter seam (internal refactor, no public behavior change).
  - `OPTION_COLLISION` error code on `RunaError` (change 5).
  - Failures inside `onError` and `cleanup` hook handlers are now logged to stderr (`runa: onError handler threw: ...`) instead of being silently swallowed; the original error still drives the exit code and cleanup still runs.
