# @runa-cmd/create

## 1.0.0

### Major Changes

- a6bdd11: **Runa 1.0.** The API is stable: from here on, what [`VERSIONING.md`](https://github.com/jrodrigopuca/runa-cmd/blob/main/VERSIONING.md) covers only breaks in a major version.

  Coming from a `0.2.0` beta, there's nothing new to do in this version. Coming from `0.1.0`, read the entries of the betas below: each one says what changed and how to migrate. The main changes since `0.1.0` are:

  - Commands, options and arguments are Zod schemas, and the same schema validates the terminal, env, the config file and an MCP tool call.
  - `--help` and `--version` work without plugins; `help` works where a command goes; usage errors exit with 2, and a command that doesn't exist with 127.
  - A config file per CLI, with one shape and errors that name the file and the key.
  - `testCLI()` runs a CLI in the same process, and gives back its exit code, output, result and error.
  - Error codes are a list, `ERROR_CODES`, read with `isRunaError()`.
  - Mistakes in a CLI's own definition stop it at startup, with a message that says how to fix them.

  `@runa-cmd/mcp` stays at `0.x` for now, since it's where the API may still change: see its changelog.

### Minor Changes

- ba3be24: New package: `npm create @runa-cmd@beta my-tool` creates a CLI ready to run, test and build. It makes the project of the getting started guide, named after yours, and installs nothing on its own.
- 4140fe9: The generator's command line follows the rules of a CLI made with Runa. A usage error exits with 2, says what's wrong in its own words, and where the help is:

  ```
  $ npm create @runa-cmd
  Missing the name of the project, as in 'npm create @runa-cmd my-tool'.
  Run 'npm create @runa-cmd -- --help' for usage.
  ```

  Before, a missing name or an extra argument printed the usage without saying what was wrong, and an unknown option showed Node's text. The README lists its arguments and exit codes, and says that npm reads its own flags first, so `--help` and `--version` go after `--`.

  **Breaking:** `-v` is gone, as in every Runa CLI, where it's left for `--verbose`. Use `--version`.

## 0.2.0-beta.7

### Minor Changes

- 4140fe9: The generator's command line follows the rules of a CLI made with Runa. A usage error exits with 2, says what's wrong in its own words, and where the help is:

  ```
  $ npm create @runa-cmd
  Missing the name of the project, as in 'npm create @runa-cmd my-tool'.
  Run 'npm create @runa-cmd -- --help' for usage.
  ```

  Before, a missing name or an extra argument printed the usage without saying what was wrong, and an unknown option showed Node's text. The README lists its arguments and exit codes, and says that npm reads its own flags first, so `--help` and `--version` go after `--`.

  **Breaking:** `-v` is gone, as in every Runa CLI, where it's left for `--verbose`. Use `--version`.

## 0.2.0-beta.6

## 0.2.0-beta.5

### Minor Changes

- ba3be24: New package: `npm create @runa-cmd@beta my-tool` creates a CLI ready to run, test and build. It makes the project of the getting started guide, named after yours, and installs nothing on its own.
