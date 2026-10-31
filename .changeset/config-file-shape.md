---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A value in the config file now reaches one command, and nothing is ignored. A key used to apply to every option with that name: `{"force":true}` turned on `--force` in any command.

**Breaking:** the shape of the file changed. A key at the root is a global option or a command, and groups nest. With `runCLI`, options stay at the root.

**Migration:** move each option under its command.

```json
// Before
{ "force": true, "priority": "high" }

// After
{ "clear": { "force": true }, "tag": { "add": { "priority": "high" } } }
```

An unknown key now exits with 2, naming the file and the key, with a suggestion if there's a close one. `$schema` is accepted. An invalid value names the file and the key too, as in `notes.config.json: invalid value for 'list.priority'`, and broken JSON is reported as a problem of the file, not as an unexpected error.

A global option can't share a name with a command in a CLI with a config file: it fails at startup with `CONFIG_COLLISION`. Rename one.

Global options now read the config file. They used to ignore it without a word, even with a value of the wrong type, so a `store` in the file left the CLI writing somewhere else. They follow the same order as any option: CLI, env, config, default.

`meta.options.<key>.configurable: false` keeps an option out of the file, so a guardrail can't be turned off by a file in the current directory. `--mcp` uses it: only the terminal can start a server.

`api.getConfigValues(path)` returns the values of one command. `@runa-cmd/mcp` uses it, so a value only keeps the option of that tool away from the model.
