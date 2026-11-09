---
'@runa-cmd/core': minor
---

**Breaking:** a `z.boolean()` option without `.default()` or `.optional()` stops the CLI at startup, with `INVALID_BOOLEAN_OPTION`:

```
Boolean option 'shout' of command 'hello' has no default: a flag that isn't passed needs one. Use z.boolean().default(false), or .optional().
```

Before, it was required: `greet hello Ana` failed with `Missing required option: --shout` on every run, and the person running the CLI couldn't fix it. Now its author sees it the first time it runs, with the fix.
