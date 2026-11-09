---
'@runa-cmd/core': minor
---

**Breaking:** a command that doesn't exist exits with 127 even when a required global option is missing, and nothing to run shows the help on stderr with exit 2. Before, with a required global, `tool nope`, `tool db nope` and `tool` all said `Missing required option: --token`, with exit 2. A command that exists still says the global is missing, with exit 2.
