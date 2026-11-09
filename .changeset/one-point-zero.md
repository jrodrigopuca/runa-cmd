---
'@runa-cmd/core': major
'@runa-cmd/help': major
'@runa-cmd/completions': major
'@runa-cmd/create': major
---

**Runa 1.0.** The API is stable: from here on, what [`VERSIONING.md`](https://github.com/jrodrigopuca/runa-cmd/blob/main/VERSIONING.md) covers only breaks in a major version.

Coming from a `0.2.0` beta, there's nothing new to do in this version. Coming from `0.1.0`, read the entries of the betas below: each one says what changed and how to migrate. The main changes since `0.1.0` are:

- Commands, options and arguments are Zod schemas, and the same schema validates the terminal, env, the config file and an MCP tool call.
- `--help` and `--version` work without plugins; `help` works where a command goes; usage errors exit with 2, and a command that doesn't exist with 127.
- A config file per CLI, with one shape and errors that name the file and the key.
- `testCLI()` runs a CLI in the same process, and gives back its exit code, output, result and error.
- Error codes are a list, `ERROR_CODES`, read with `isRunaError()`.
- Mistakes in a CLI's own definition stop it at startup, with a message that says how to fix them.

`@runa-cmd/mcp` stays at `0.x` for now, since it's where the API may still change: see its changelog.
