# @runa-cmd/create

Create a CLI made with [Runa](https://github.com/jrodrigopuca/runa-cmd), ready to run, test and publish.

```bash
npm create @runa-cmd@beta my-tool
cd my-tool
npm install
node src/main.ts hello Ana
```

Until Runa reaches 1.0, add `@beta`, as above.

It works with pnpm, yarn and bun too, as `pnpm create @runa-cmd@beta my-tool`, and the next steps it prints use the one you ran it with.

## What you get

| File | What it is |
|---|---|
| `src/cli.ts` | Your commands. It exports the CLI without starting it, so tests can import it |
| `src/main.ts` | Starts the CLI. It's the program that gets installed |
| `src/cli.test.ts` | Tests with `testCLI()`, run by `node --test` |
| `tsconfig.json` | Runs your TypeScript as it is while you develop, and builds `dist/` to ship |
| `package.json` | `bin` named after your project, and `build` to compile |

The name is used for the folder, the package and the command people type, so it takes lowercase letters, numbers and dashes. It won't write into a folder that already has files, and it installs nothing: you choose the package manager and when.

These are the files of the [getting started guide](https://github.com/jrodrigopuca/runa-cmd/blob/main/guides/getting-started.md), which explains each of them. Its code runs in CI, so what this creates works.
