---
'@runa-cmd/core': patch
---

A command without `meta.description` has one type error, the one that says so. TypeScript also reported `Type 'string' is not assignable to type 'void | Promise<void>'` on `run`, which looked like a problem with what the command returns: when a field fails, TypeScript can't infer the types of `defineCommand` and uses their defaults, and the default of what `run()` returns was `void`. It's `unknown` now. `description` is still required: it's what a model reads to choose a tool.
