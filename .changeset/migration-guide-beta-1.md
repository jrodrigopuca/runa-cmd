---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

**Upgrading from `0.2.0-beta.0`.** Update all four packages together: `help`, `mcp` and `completions` now require this version of `core`, and npm refuses an older one.

**What people typing your CLI will notice**

| Before | Now | What to do |
|---|---|---|
| `--darkColor` for a key `darkColor` | `--dark-color`; the camelCase form is a usage error that points to it | Update scripts and docs |
| Ctrl+C ended the process at once, with no `cleanup` | Runs `cleanup` and exits with 130; `SIGTERM` exits with 143. A command that ignores `signal` is waited for 2 seconds, and a second Ctrl+C leaves at once | Pass `signal` to what your command starts |
| `tool` with no command, or `tool db` on a group, exited with 127 | Help on stderr, exit 2 | Check scripts that compare the exit code |
| `--tag --force` took `--force` as the value of `--tag` | `Option --tag requires a value` | Use `--tag=--force` for that value |
| An extra positional on a command without args exited with 1 | Exit 2 | Check scripts that compare the exit code |
| Exact text of usage errors | Shorter, and they end with `Run '<cli> --help' for usage.` | Update anything that matches this text |

**What you need to change in your code**

| Before | Now | What to do |
|---|---|---|
| `runCLI(cmd, argv)` | `runCLI(cmd, { argv })` | Change the call |
| A boolean named `noCache` | The CLI stops at startup | Declare `cache: z.boolean().default(true)` |
| `hint` in `meta.options` | Removed: it had no effect | Delete it |
| `ctx.globalOptions.help` | Gone: `helpPlugin` no longer adds a global option | Use `api.replaceHelp(show)` with the `replaceHelp` capability |
| `RunContext`, `HookContext` or `OptionSchema` built by hand, as in tests | They now require `signal`, and `flag` | Add them |
| `onError` with `ctx.handled = true` exited with 0 | Keeps the error's exit code | Set `process.exitCode = 0` if the plugin truly recovered |
| `defineCLI` with a single command | Still works, and warns once | Move to `runCLI`: it will be removed before 1.0 |

**Values that used to be ignored**

| Before | Now | What to do |
|---|---|---|
| A boolean with `.default()` ignored env and config | They take effect, and an invalid value exits with 2 | Check boolean options that declare `env` |
| `exec [target] -- ls -la` left `ls` in `ctx.rest` | `ls` fills `target`, and what's left goes to `ctx.rest` | Don't declare a positional for a wrapped command |
| `z.array()` options always failed | They repeat, and env splits by commas | Nothing, unless a value in env has a comma |

**If you expose your CLI over MCP**

| Before | Now | What to do |
|---|---|---|
| Tools ran inside the server | Each call runs your CLI as a new process, about 140 ms in a minimal CLI | Don't count on state between calls |
| Options with `env` were tool parameters | They never reach the schema | Use `tools.<name>.expose` for those the model should choose |
| Output had no limit | 100 KiB by default, and a larger returned value fails with `output_too_large` | Set `maxOutput` if you need more |
| Every command was a tool | Still the default, now with `exclude` | Review which commands an agent should have, plugin commands included |
