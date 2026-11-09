# @runa-cmd/create

Create a CLI made with [Runa](https://github.com/jrodrigopuca/runa-cmd), ready to run, test and publish.

```bash
npm create @runa-cmd my-tool
cd my-tool
npm install
node src/main.ts hello Ana
```

It works with pnpm, yarn and bun too, as `pnpm create @runa-cmd my-tool`, and the next steps it prints use the one you ran it with.

## Usage

```
npm create @runa-cmd <name>
```

| Argument | What it does |
|---|---|
| `<name>` | The folder, the package and the command, as in `my-tool` |
| `-h`, `--help` | Shows how to use it |
| `--version` | Shows its version |

npm reads its own flags first: to reach these, put them after `--`, as in `npm create @runa-cmd -- --help`.

| Exit | When |
|---|---|
| `0` | The project was created, or it showed the help or the version |
| `2` | A usage error, with what's wrong: an unknown option, no name or more than one, a name that can't be one, or a folder that already has files |
| `1` | Something else failed, as a file it couldn't write |

Like any CLI made with Runa, there's no `-v`, which other tools use for `--verbose`.

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
