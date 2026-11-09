# Contributing to Runa

Thanks for your interest in contributing to Runa! This guide covers everything you need to get up and running.

## Prerequisites

- **Node.js** >= 24.0.0 (the supported baseline — Node 18/20 are EOL)
- **pnpm** >= 10.x (the repo uses `packageManager` field, so corepack works too)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/jrodrigopuca/runa-cmd.git
cd runa-cmd

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test
```

## Project Structure

```
runa-cmd/
├── packages/
│   ├── core/          # @runa-cmd/core — CLI engine, parsing, plugins, middleware
│   ├── help/          # @runa-cmd/help — Themeable help output
│   ├── mcp/           # @runa-cmd/mcp — MCP server mode
│   └── completions/   # @runa-cmd/completions — Shell completions (bash/zsh/fish)
├── examples/
│   └── demo/          # Full demo CLI showcasing all features
├── docs/              # Source of truth: components, flows, ADRs, backlog, status
├── scripts/           # Repo tooling (docs:check)
├── biome.json         # Linter & formatter config
├── pnpm-workspace.yaml
└── tsconfig.json      # Root TypeScript config
```

This is a **pnpm workspace monorepo**. Each package under `packages/` is published independently to npm under the `@runa-cmd` scope.

## Development Workflow

### Available Scripts

| Script | Description |
|---|---|
| `pnpm build` | Build all packages (`tsc` in each) |
| `pnpm dev` | Watch mode — rebuilds on changes (parallel across all packages) |
| `pnpm test` | Run all tests with vitest |
| `pnpm typecheck` | Type-check all packages without emitting |
| `pnpm lint` | Check code with Biome |
| `pnpm lint:fix` | Auto-fix lint and formatting issues |
| `pnpm demo` | Run the demo CLI (`examples/demo`) |
| `pnpm clean` | Remove all `dist/` directories |
| `pnpm docs:check` | Verify links, paths, ADRs, backlog and known issues in `docs/` |

### Important: Build Before Testing the Demo

Packages import from `dist/` (compiled output), **not** from `src/`. If you change source files in any package, you **must rebuild** before the demo or other consumers see the changes:

```bash
# Option 1: One-shot build
pnpm build

# Option 2: Watch mode (recommended during development)
pnpm dev
```

### Running the Demo

The demo CLI is a full example showcasing commands, plugins, middleware, and error handling:

```bash
# Run with arguments directly (no -- needed)
pnpm demo --help
pnpm demo deploy api --env staging
pnpm demo init my-project --template react
pnpm demo logs api --level error --follow
pnpm demo config --json
```

### Running Tests for a Single Package

```bash
# Filter by package name
pnpm --filter @runa-cmd/core test
pnpm --filter @runa-cmd/help test

# Watch mode for a single package
pnpm --filter @runa-cmd/core test:watch
```

## Code Standards

### TypeScript

- **Strict mode** — `strict: true` in tsconfig, no escape hatches
- **ESM-only** — `type: "module"` everywhere
- **Node builtins** — Always use `node:` prefix (e.g., `import { parseArgs } from 'node:util'`)
- **Relative imports** — Always use `.js` extension (e.g., `import { foo } from './bar.js'`)
- **`verbatimModuleSyntax`** — Use `import type` for type-only imports

### Linting & Formatting

We use [Biome](https://biomejs.dev/) (not ESLint/Prettier):

```bash
# Check for issues
pnpm lint

# Auto-fix everything
pnpm lint:fix
```

Key settings (see `biome.json`):
- **Tabs** for indentation
- **Single quotes** for strings
- **Trailing commas** everywhere
- **100 character** line width
- **LF** line endings
- Unused imports and variables are **errors**

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add config file loading
fix(help): correct triple-dash alias rendering
refactor(mcp): simplify tool registration
docs: update README with MCP examples
test(completions): add fish generator edge cases
chore: update dependencies
```

**Scopes** match package names: `core`, `help`, `mcp`, `completions`, `demo`, plus `docs`.

### Testing

- **Framework**: [Vitest](https://vitest.dev/) v4
- **Location**: Tests live in `src/__tests__/` within each package
- **Naming**: `*.test.ts` for runtime tests, `*.test-d.ts` for type-level tests
- Tests are **excluded from the build** (`tsconfig.json` has `"exclude": ["src/__tests__"]`)

```bash
# Run all tests
pnpm test

# Run tests for one package in watch mode
pnpm --filter @runa-cmd/core test:watch
```

## Architecture Guidelines

### Zero Runtime Dependencies (Core)

`@runa-cmd/core` has **zero runtime dependencies**. Zod is a peer dependency. This is intentional — keep it that way. If you need a utility, implement it or put it in the right package.

### Schema is the Source of Truth

The Zod schema defines everything: types, validation, help text, MCP tools, completions. **Never** duplicate information that can be derived from the schema.

### Plugin System

Plugins extend the CLI via hooks. See `packages/core/src/plugin.ts` and the existing plugins (help, mcp, completions) as reference implementations.

### Documentation

[`docs/`](./docs/README.md) is the **source of truth**: components, flows, architecture decisions (ADRs), backlog, status and known issues. Check the [ADR index](./docs/adr/README.md) before proposing a design change. Accepted ADRs are never edited: a new ADR replaces them.

## Making a Contribution

Every change follows the cycle in [`docs/process.md`](./docs/process.md): document, write a failing test, code, test, verify, document. Enable the local check once per clone:

```bash
git config core.hooksPath .githooks
```

### For Bug Fixes

1. **Open an issue** describing the bug with reproduction steps
2. Fork the repo and create a branch: `fix/description`
3. Write a failing test that reproduces the bug
4. Fix the bug
5. Ensure all tests pass: `pnpm test`
6. Ensure lint is clean: `pnpm lint`
7. Update `docs/`, including known issues
8. Submit a PR

### For New Features

1. **Open an issue first** to discuss the feature and its fit with the [backlog](./docs/backlog.md) and ADRs
2. Fork the repo and create a branch: `feat/description`
3. Document the intended behavior in `docs/`
4. Implement with tests
5. Ensure all tests pass and lint is clean
6. Update the component docs and the README if the feature is user-facing
7. Submit a PR

### PR Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Lint is clean (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Docs are consistent (`pnpm docs:check`)
- [ ] New features include tests
- [ ] Commit messages follow conventional commits

## Releases

> **Publishing is for maintainers only** — but every contributor participates in
> the first step: changesets.

Releases are driven by [Changesets](https://github.com/changesets/changesets).
Versioning is automated; **publishing is deliberately manual** (local, with npm
2FA in hand — no npm token lives in CI secrets).

### Declaring a Change (contributors)

If your PR changes a published package (`core`, `help`, `mcp`, `completions`,
`create`), add a changeset alongside it:

```bash
pnpm changeset
```

Pick the affected package(s) and bump type, describe the change — the generated
`.changeset/*.md` file is committed with your PR. Private packages, like the
examples, are never versioned (`privatePackages: false`): `examples/getting-started`
is the template of `@runa-cmd/create`, and a bump there would give every new
project a version that `--version` doesn't print. `core`, `help`,
`completions` and `create` are a `fixed` group up to their 1.0.0, and
`@runa-cmd/mcp` versions on its own, at `0.x`, until its own 1.0
([ADR-0050](./docs/adr/0050-la-1-0-sale-sin-mcp.md)). After the 1.0 is out, the
group empties and each package versions on its own
([ADR-0039](./docs/adr/0039-paquetes-independientes-desde-1-0.md)).

> The repo left changesets pre-release mode for the 1.0: publishes land under
> the npm `latest` dist-tag.

### The Version Packages PR (automated)

On every push to `main` with pending changesets, the `Release` workflow
(`.github/workflows/release.yml`, `changesets/action`) opens or updates a
**"Version Packages" PR** that applies all pending changesets: package.json
version bumps + CHANGELOG entries. It does NOT publish anything.

### Publishing (maintainers, local)

1. Be logged in to npm (`npm whoami`) with access to the `@runa-cmd` org and
   2FA enabled.
2. Merge the **Version Packages** PR on `main`.
3. Publish from an up-to-date local checkout:

```bash
git checkout main && git pull origin main
pnpm release   # = pnpm build && changeset publish (asks for your npm OTP)
```

`changeset publish` publishes every package whose version is ahead of the
registry, in dependency order, and creates git tags — push them afterwards:

```bash
git push --follow-tags
```

> **Note:** the `@runa-cmd/core` peer dependency in `help`/`mcp`/`completions`
> is an **explicit range**, not `workspace:*`. This is deliberate: it prevents
> changesets from escalating every release to a major bump (see
> `.changeset/config.json`'s `onlyUpdatePeerDependentsWhenOutOfRange`). In
> pre-release mode that escalation would publish `1.0.0-beta.0`.
> `devDependencies` still use `workspace:*` (unpublished).
>
> **Until 1.0, the peer is the current version of `core`** (T-233). The range is
> a floor, and changesets doesn't raise it: a plugin using something new from
> `core` would install with an older one, where that feature does nothing. So
> while the packages release together, in the `fixed` group, each plugin's peer
> is `^` plus `core`'s version. The `Release` workflow keeps it there: it runs
> `pnpm version-packages`, which is `changeset version` followed by
> `node scripts/peers.mjs --write`. Changesets never sees that edit, so nothing
> escalates. `pnpm docs:check` fails if a peer doesn't match. If you run
> `changeset version` by hand, run `node scripts/peers.mjs --write` after it.
> After 1.0, with independent packages, T-506 decides how each peer is kept.
>
> `@runa-cmd/mcp` is out of the group, so `peers.mjs` doesn't keep its peer:
> it's `^1.0.0`, set by hand before the 1.0 was versioned. Without that,
> `onlyUpdatePeerDependentsWhenOutOfRange` would take `mcp` to a major along
> with `core`. Raise it by hand when `mcp` starts using something newer.

### Post-Publish Verification

```bash
# Verify versions and dist-tags: each release lands on `latest`
npm view @runa-cmd/core dist-tags
npm view @runa-cmd/help dist-tags
npm view @runa-cmd/mcp dist-tags
npm view @runa-cmd/completions dist-tags
npm view @runa-cmd/create dist-tags

# Test installation in a fresh directory
mkdir /tmp/runa-test && cd /tmp/runa-test
npm init -y
npm install @runa-cmd/core @runa-cmd/help @runa-cmd/mcp zod

# Test the generator: it must create a project that installs, tests and builds
cd /tmp && npm create @runa-cmd runa-created && cd runa-created
npm install && npm test && npm run build && node dist/main.js hello Ana

# The README reaches npm view (KI-041)
npm view @runa-cmd/core readme | head -3
```

### Why No Automated Publish?

A classic npm automation token would bypass 2FA, and granular tokens expire
every 90 days — at this release cadence, a Bypass-2FA secret sitting in CI is
worse security than a human publishing locally with 2FA. Once the packages
exist on the registry, the plan is to migrate to npm **Trusted Publishing
(OIDC)** — tokenless, workflow-bound publishing from CI — and retire the local
step.

## Questions?

Open an issue or start a discussion on the [GitHub repo](https://github.com/jrodrigopuca/runa-cmd).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
