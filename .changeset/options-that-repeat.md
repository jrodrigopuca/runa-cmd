---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

`z.array()` options now work: `--tag a --tag b` gives `['a', 'b']`, and each element is converted to its type, so `z.array(z.number())` gives numbers. Before, they always failed, even with one value.

Env values are split by commas and trimmed, so `TAGS=a, b` gives `['a', 'b']` and `TAGS=` gives `[]`. Config files use a JSON array. Each source replaces the ones below it, without adding up.

Help shows `--tag <string>...`. zsh keeps offering the option, fish says it can be repeated, and bash and fish offer the values of a `z.array(z.enum(...))`. `getSchema()` adds `itemType` to these options.
