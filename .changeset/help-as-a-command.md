---
'@runa-cmd/core': minor
---

`help` works where a command goes, as in commander, yargs, cac and oclif. `tool help` is `tool --help`, `tool help db migrate` is `tool db migrate --help`, and `tool db help` shows the help of the group, on stdout with exit 0. Before, `tool help` exited with 127 and suggested another command, and a model that tried it lost a turn.

A command of yours named `help` still runs, and inside a command `help` is a value: `tool greet help` passes it to the argument. With `runCLI` nothing changes, since the command is the CLI. A name that doesn't exist after it is reported as any other: `tool help deplo` exits with 127 and suggests `deploy`. It isn't a command, so it's not in the list, nor an MCP tool.
