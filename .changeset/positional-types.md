---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A positional now gets the type of its schema. `args: { id: z.number() }` used to fail at the terminal with `expected number, received string`, although TypeScript said it was a number and it worked through MCP.

Numbers and booleans convert as in an option, in each item of a variadic too, and an empty string is still never read as 0. An invalid value says `Invalid value for <id>: expected number`.

**Migration:** if you used `z.coerce.number()` as a workaround, `z.number()` is enough now.
