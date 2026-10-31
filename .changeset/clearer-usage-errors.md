---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Clearer usage errors, and an API where every field does something.

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
