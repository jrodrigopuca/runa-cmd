# @runa-cmd/mcp

## 0.2.0-beta.2

### Minor Changes

- b158ee6: What's left after `--` is now a usage error, unless the command asks for it. `tool a -- b` used to ignore `b` with exit 0, so data got lost in silence. `--` still fills empty positionals.

  **Breaking:** a command that reads `ctx.rest` has to declare `rest: true`. Without it, `ctx.rest` is empty and the extra tokens exit with 2 and `Unexpected positional argument`.

  **Migration:** add `rest: true` to commands that wrap another program. If you validated `ctx.rest` by hand to reject extras, delete that code.

  `meta.options.<key>.valueName` names the value in help: `valueName: 'hex'` shows `--color <hex>` instead of `--color <string>`. It works in the built-in help and in `@runa-cmd/help`.

  Clearer errors for mistyped flags:

  - `--no-color` on an unknown option now says `Unknown option: --no-color`, not `--color`.
  - `--no-style` on an option that takes a value now says it can't be negated.
  - A typo in `--help` or `--version` gets a suggestion, and so does `-V`, which points to `--version`.

### Patch Changes

- 2d372e1: The built-in help no longer shows `(default: false)`, as `@runa-cmd/help` already didn't.

## 0.2.0-beta.1

### Minor Changes

- 1ddc91c: Boolean options now follow CLI > env > config > default.

  - **Env and config are honored.** A boolean with `.default()` used to ignore both silently: `MINIFY=true` gave `false`. The schema default no longer reaches `parseArgs`, so it applies last.
  - **Booleans accept `true`, `1`, `false` and `0`,** in any case, from every source. `MINIFY=true` on an optional boolean used to fail, and `--minify=false` used to exit 2.
  - **Any other value is a usage error (exit 2).** Before, `MINIFY=quizas` on a boolean with a default was silently ignored.

  **Migration:** an env var or config value that was being ignored now takes effect, and an invalid one now fails. Check the boolean options of your CLI that declare `env`.

- 763a1a2: Authors now choose what an MCP server exposes. `mcpPlugin({ exclude: ['deploy'] })` removes a tool, so it can't be listed or called. Per tool, `tools: { deploy: { description, annotations } }` replaces what the model reads and passes MCP annotations like `destructiveHint` to the client.

  Annotations are hints, not access control: `exclude` is the only real boundary. An unknown name in `exclude`, an excluded tool with settings, or a tool both read-only and destructive stop the server at startup.

- edfb79e: Clearer usage errors, and an API where every field does something.

  - **Missing values are reported as such.** `--label` without a value now says `Option --label requires a value`. `--tag --force` no longer takes `--force` as the value of `--tag`; it used to drop the flag silently.
  - **Extra positionals on a command without args exit 2** instead of 1, with the usual message.
  - **Suggestions scale with the input,** so `--nope` no longer suggests `--size`, while real typos still get one.
  - **Shorter errors:** `Missing required argument: <content>`, without repeating the name or the description. The same goes for missing options.
  - **Usage errors point to the next step** with `Run '<cli> --help' for usage.`
  - **Invalid `output` names the command and the field** instead of dumping Zod's JSON. It uses the code `INVALID_OUTPUT`.
  - **`deprecated` warns when the option is used,** from the CLI, env or config. The command still runs.
  - **Help omits `[default: false]`.**

  **Breaking changes in the API**

  - **`hint` is gone** from `OptionMeta` and `OptionSchema`: it had no effect. Remove it from your `meta.options`.
  - **`PluginMeta.version` is optional,** and the official plugins no longer declare it. Nothing reads it; use `peerDependencies` for compatibility.

  **Migration:** a value that looks like a registered flag now needs the `=` form: `--label=--force`. If you match error text, note the shorter messages.

- ee5d2ef: An option that declares `env` never reaches an MCP tool's schema, even if the variable isn't set. A forgotten `API_TOKEN` no longer becomes a parameter a model can ask a person for: the call fails with the usual error.

  **Migration:** to let the model choose an option that declares `env`, add it to `mcpPlugin({ tools: { deploy: { expose: ['env'] } } })`.

- 1ed131e: A failed MCP tool call now says what happened to the command's effects, so a model doesn't repeat what already ran. The text ends with that sentence, and `_meta['runa/error']` carries `{ class, effect, safeToRetry }`, where `effect` is `none`, `unknown` or `completed`. A command that fails partway reports `unknown`, and an invalid `output` reports that the command already ran.

  Tool errors no longer include hints for people, like `RUNA_DEBUG` or `--help`, unless the operator sets `RUNA_DEBUG`. A call whose `run()` finished is now an error if the process exits with an error afterwards, and a skipped command reads `did not run` instead of `did not finish`.

- e367c5c: Cleanup always runs, and no failure exits silently.

  - **`cleanup` runs on unhandled errors.** The `cleanup` hook and plugin `cleanup()` used to be skipped because `process.exit` ran first. They now finish, including async ones, before the process exits.
  - **Every failure explains itself.** Typed errors (`RunaError` and subclasses) print as written. Any other error prints `Unexpected error in '<command>': <message>` and how to see more. An error without a message prints `'<command>' failed without an error message (<type>)` instead of nothing.
  - **`RUNA_DEBUG=1`** adds the stack trace, error code and cause.
  - **`ctx.handled` only controls the output.** Marking an error as handled used to exit 0, reporting a failure as success. The run now keeps the error's exit code. A plugin that truly recovered can set `process.exitCode = 0` in `onError`.

  **Migration:** if your `onError` sets `ctx.handled = true` and your scripts rely on exit 0, set `process.exitCode = 0` there. If you match the exact text of an unexpected error on stderr, it now has a prefix.

- e92ca91: `--help` and `-h` now work with no plugin: `tool --help` and `tool db migrate --help` show plain help, with the global options that work on that command. Help and completions list `--help`, and `--version` when the CLI has a version. Usage errors always end with `Run '<cli> --help' for usage.`

  A command that declares `-h` or `--help` keeps it, and the CLI starts, with or without `@runa-cmd/help`. Each flag yields separately, so `--help` still shows help on a command that took `-h`.

  `getSchema()` now includes `help`, and `version` when the CLI has one, in `globalOptions`.

  **Migration:** `helpPlugin` no longer registers a `help` global option, so `ctx.globalOptions.help` is gone: a plugin that read it to show its own help now uses `api.replaceHelp(show)`, with the `replaceHelp` capability. `@runa-cmd/help` no longer has `zod` as a peer dependency.

- 4d81cd4: Hooks can tell where a run comes from: `ctx.invocation` is `{ surface: 'cli' }`, or `{ surface: 'tool', tool }` for a tool call. Selecting the command and its values is now separate from running it, which doesn't change how a CLI behaves.
- 9040481: Option keys in camelCase now become kebab-case flags: `darkColor` is `--dark-color`, and `outputURL` is `--output-url`. `run()`, config files and MCP tools keep the key. A key with hyphens stays as written. Help, errors and completions show the flag, which `getSchema()` exposes in the new `flag` field of each option.

  **Breaking:** `--darkColor` no longer works: it's a usage error that points to `--dark-color`. Scripts that use the camelCase form need the new one.

  A boolean named `noCache` now stops the CLI at startup, because `--no-cache` already negates `cache`. Two keys that give the same flag do too.

  **Migration:** rename a boolean like `noCache: z.boolean().default(false)` to `cache: z.boolean().default(true)`. Code that builds an `OptionSchema` by hand now has to include `flag`.

- 5a40030: **Upgrading from `0.2.0-beta.0`.** Update all four packages together: `help`, `mcp` and `completions` now require this version of `core`, and npm refuses an older one.

  **What people typing your CLI will notice**

  | Before                                                           | Now                                                                                                                                                      | What to do                                |
  | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
  | `--darkColor` for a key `darkColor`                              | `--dark-color`; the camelCase form is a usage error that points to it                                                                                    | Update scripts and docs                   |
  | Ctrl+C ended the process at once, with no `cleanup`              | Runs `cleanup` and exits with 130; `SIGTERM` exits with 143. A command that ignores `signal` is waited for 2 seconds, and a second Ctrl+C leaves at once | Pass `signal` to what your command starts |
  | `tool` with no command, or `tool db` on a group, exited with 127 | Help on stderr, exit 2                                                                                                                                   | Check scripts that compare the exit code  |
  | `--tag --force` took `--force` as the value of `--tag`           | `Option --tag requires a value`                                                                                                                          | Use `--tag=--force` for that value        |
  | An extra positional on a command without args exited with 1      | Exit 2                                                                                                                                                   | Check scripts that compare the exit code  |
  | Exact text of usage errors                                       | Shorter, and they end with `Run '<cli> --help' for usage.`                                                                                               | Update anything that matches this text    |

  **What you need to change in your code**

  | Before                                                                   | Now                                               | What to do                                                    |
  | ------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------- |
  | `runCLI(cmd, argv)`                                                      | `runCLI(cmd, { argv })`                           | Change the call                                               |
  | A boolean named `noCache`                                                | The CLI stops at startup                          | Declare `cache: z.boolean().default(true)`                    |
  | `hint` in `meta.options`                                                 | Removed: it had no effect                         | Delete it                                                     |
  | `ctx.globalOptions.help`                                                 | Gone: `helpPlugin` no longer adds a global option | Use `api.replaceHelp(show)` with the `replaceHelp` capability |
  | `RunContext`, `HookContext` or `OptionSchema` built by hand, as in tests | They now require `signal`, and `flag`             | Add them                                                      |
  | `onError` with `ctx.handled = true` exited with 0                        | Keeps the error's exit code                       | Set `process.exitCode = 0` if the plugin truly recovered      |
  | `defineCLI` with a single command                                        | Still works, and warns once                       | Move to `runCLI`: it will be removed before 1.0               |

  **Values that used to be ignored**

  | Before                                             | Now                                                     | What to do                                       |
  | -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
  | A boolean with `.default()` ignored env and config | They take effect, and an invalid value exits with 2     | Check boolean options that declare `env`         |
  | `exec [target] -- ls -la` left `ls` in `ctx.rest`  | `ls` fills `target`, and what's left goes to `ctx.rest` | Don't declare a positional for a wrapped command |
  | `z.array()` options always failed                  | They repeat, and env splits by commas                   | Nothing, unless a value in env has a comma       |

  **If you expose your CLI over MCP**

  | Before                                  | Now                                                                           | What to do                                                           |
  | --------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
  | Tools ran inside the server             | Each call runs your CLI as a new process, about 140 ms in a minimal CLI       | Don't count on state between calls                                   |
  | Options with `env` were tool parameters | They never reach the schema                                                   | Use `tools.<name>.expose` for those the model should choose          |
  | Output had no limit                     | 100 KiB by default, and a larger returned value fails with `output_too_large` | Set `maxOutput` if you need more                                     |
  | Every command was a tool                | Still the default, now with `exclude`                                         | Review which commands an agent should have, plugin commands included |

- 8030fbb: With nothing to run, a CLI now shows help on stderr and exits with 2, instead of failing with 127. That covers `tool` on a CLI with several commands, and `tool db` on a group. A name that doesn't exist is still a 127, with its suggestion.

  Help now uses the same routing as running a command, so what it shows can't differ from what would run. `defineCLI` with a single command shows that command's help, and `--help` and `--version` work even if a required global option is missing.

  A process stopped by a signal now exits with 130 or 143 also when the lifecycle ended early, as an MCP server does.

  **Migration:** `api.replaceHelp` handlers receive a second argument, the stream to write to. Write there instead of to `process.stdout`.

- 03f4e76: In MCP, whoever starts the server beats the model.

  - **Fixed values leave the tool's schema.** An option with a value from an env var or the config file is hidden, and if a model sends it anyway, it's dropped. A required option that already has a value no longer asks the model for anything.
  - **`mcpPlugin({ tools })` adjusts this per tool:** `expose` leaves an option to the model, and `serverOnly` makes the server refuse to start without a value.
  - **Fixed values are redacted** from the stdout and stderr returned to the model, when they have 8 characters or more. So are the global options the server started with. What `run()` returns is left as it is.
  - **`api.getConfigValues()`** lets a plugin read the config file of the CLI.

  **Migration:** an option an agent used to set may disappear from its tool if env or config give it a value. Use `tools.<name>.expose` to keep it.

- 1b0d6c1: `z.array()` options now work: `--tag a --tag b` gives `['a', 'b']`, and each element is converted to its type, so `z.array(z.number())` gives numbers. Before, they always failed, even with one value.

  Env values are split by commas and trimmed, so `TAGS=a, b` gives `['a', 'b']` and `TAGS=` gives `[]`. Config files use a JSON array. Each source replaces the ones below it, without adding up.

  Help shows `--tag <string>...`. zsh keeps offering the option, fish says it can be repeated, and bash and fish offer the values of a `z.array(z.enum(...))`. `getSchema()` adds `itemType` to these options.

- 81ac2d6: A CLI made of one command is now first class, with `--version` and a POSIX `--`.

  - **`runCLI(command, options?)` takes plugins,** plus `middleware`, `config`, `globalOptions`, `globalMeta` and `strictOptions`. Help, MCP and completions all work with it.
  - **`runCLI` runs in an explicit root mode.** A value equal to the command name is data: `tool tool` passes `"tool"`. A subcommand added by a plugin routes by name, and `--` passes that name as data.
  - **`--version` is built in** when `meta.version` is set, in `defineCLI` and `runCLI`. It has no short alias, and a command's own `--version` option wins.
  - **`--` fills empty positionals,** as POSIX operands. A variadic counts as one, and what's left goes to `ctx.rest`.
  - **`defineCLI` with one command is deprecated** when it routes implicitly. It keeps working and warns once. It will be removed before 1.0.

  `CLISchema` gains an optional `root`, and `RunCLIOptions` is exported.

  **Migration:**

  - `runCLI(cmd, argv)` is now `runCLI(cmd, { argv })`.
  - With `exec [target] -- ls -la`, `ls` now fills `target`. Commands that wrap another one should declare no positional for it, or read it from `ctx.rest`.
  - With a variadic and nothing before `--`, as in `lint -- --fix`, the token now lands in the variadic instead of `ctx.rest`.

- 374b25f: Stopping a run now reaches everything it started. `run()` and hooks receive `signal`, an `AbortSignal` that fires on `SIGINT`, `SIGTERM` or a cancelled tool. `cleanup` runs in all those cases, and a CLI exits with 130 or 143.

  **Behavior change:** Ctrl+C no longer ends a CLI at once. A command that ignores `signal` stops being waited for after 2 seconds, the process ends after 5 at most, and a second Ctrl+C leaves at once. A command that blocks the event loop can't react until it yields: `Ctrl+\` still ends it.

  **Migration:** code that builds a `RunContext` or a `HookContext` by hand, as in unit tests, now has to include `signal`.

  In MCP, cancelling a call or closing the server ends the child and what it started, and a child stops by itself if the server dies. Tool output is limited to 100 KiB by default: longer output keeps its start and end with a notice, and `maxOutput` changes the limit globally or per tool. A returned value over the limit fails with `output_too_large`.

- 25ce70b: MCP tools now run as a child process of your own CLI, so a tool is the same command a person runs.

  - **The whole lifecycle applies:** env vars, config files, startup global options, hooks and middleware. A middleware can reject a call.
  - **Commands can print.** What they write no longer reaches the protocol. A returned value is the result, and without one, stdout is.
  - **Calls are isolated.** Simultaneous calls don't mix, and a `process.exit` in a command only ends that call.
  - **No false success.** If a command never finished, as when a middleware skips it, the tool returns an error.
  - **Any input travels intact,** including arrays, objects and large values, and validation runs once, in the same place as the CLI.
  - **`cleanup` runs when the server closes,** not before the first call.
  - **The server checks at startup that it can run itself.** `mcpPlugin({ selfCommand })` sets how, if the check fails.

  **Migration:** each call is a new process, so don't count on state shared between calls. A call now takes about 140 ms in a minimal CLI, plus whatever your CLI takes to start. `exports` of `@runa-cmd/core` gains `./internal`, which is not public API.

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
