---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Hooks can tell where a run comes from: `ctx.invocation` is `{ surface: 'cli' }`, or `{ surface: 'tool', tool }` for a tool call. Selecting the command and its values is now separate from running it, which doesn't change how a CLI behaves.
