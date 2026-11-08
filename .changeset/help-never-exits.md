---
'@runa-cmd/help': minor
---

**Breaking:** `helpPlugin({ exitOnHelp })` is removed. It brought back the `process.exit(0)` of 0.1.0, which skips `cleanup` and can cut stdout in a pipe, and it exited with 0 even with nothing to run. The help now always ends like any command: `cleanup` runs, and the process exits with 0 for `--help`, or with 2 when there's nothing to run.

In TypeScript, passing it is a type error. In JS, the plugin says on stderr that it was removed, and the CLI keeps working.

**Migration:** remove the option. If your CLI stayed open after the help, close what keeps it open in a `cleanup` hook.

The README also says now that `--help` and `-h` are core's, and that the plugin only changes how the help looks.
