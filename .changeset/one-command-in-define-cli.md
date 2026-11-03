---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

`defineCLI` no longer skips the command name when there's only one command. That mode depended on counting commands, so adding a plugin with a command of its own broke `tool hola`, and `tool tool` took a value for the name. It was deprecated with `RUNA_IMPLICIT_SINGLE_COMMAND`.

**Breaking:** a `defineCLI` with one command now routes as any other: `tool hola` exits with 127.

**Migration:** for a CLI of one command, use `runCLI`.

```ts
// Before
await defineCLI({ meta: { name: 'tool' }, commands: { tool } }).run();

// After
await runCLI(tool);
```

If you'd rather keep `defineCLI`, write the command name: `tool tool hola`.
