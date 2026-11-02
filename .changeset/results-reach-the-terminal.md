---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

What a command returns now reaches the terminal. It used to reach MCP tools only, so at the terminal a command that returned data showed nothing and exited with 0.

A string goes to stdout as it is, and anything else as JSON. `run()` can return a value without `output`: this used to be a type error, even though it worked.

`format: (result) => string` says what a person reads. It receives the type of what `run()` returned, doesn't run for a tool, and gives the command a `--json` flag that prints the data. A command with `format` that returns nothing fails with `MISSING_RESULT`.

**Breaking:** a command that prints and also returns shows both. A command with `format` can't declare an option called `json`, and no global option can take that name while such a command exists.

**Migration:** move the printing to `format`, and delete your own `json` option.

```ts
// Before
options: { json: z.boolean().default(false) },
run({ options }) {
  const status = read();
  console.log(options.json ? JSON.stringify(status) : `Port ${status.port}`);
  return status;
},

// After
run: () => read(),
format: (status) => `Port ${status.port}`,
```

Progress belongs on stderr, with `console.error`, so `--json` stays clean to pipe.
