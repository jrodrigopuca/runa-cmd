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
├── biome.json         # Linter & formatter config
├── pnpm-workspace.yaml
├── RUNA-SPEC.md       # Framework specification (source of truth)
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

**Scopes** match package names: `core`, `help`, `mcp`, `completions`, `demo`.

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

### RUNA-SPEC.md

`RUNA-SPEC.md` at the repo root is the **specification document**. Major design decisions should align with it. If you want to propose changes to the spec, open an issue first.

## Making a Contribution

### For Bug Fixes

1. **Open an issue** describing the bug with reproduction steps
2. Fork the repo and create a branch: `fix/description`
3. Write a failing test that reproduces the bug
4. Fix the bug
5. Ensure all tests pass: `pnpm test`
6. Ensure lint is clean: `pnpm lint`
7. Submit a PR

### For New Features

1. **Open an issue first** to discuss the feature and its alignment with the spec
2. Fork the repo and create a branch: `feat/description`
3. Implement with tests
4. Ensure all tests pass and lint is clean
5. Update relevant README if the feature is user-facing
6. Submit a PR

### PR Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Lint is clean (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] New features include tests
- [ ] Commit messages follow conventional commits

## Releases

> **Publishing is for maintainers only** — but every contributor participates in
> the first step: changesets.

Releases are driven by [Changesets](https://github.com/changesets/changesets).
Versioning is automated; **publishing is deliberately manual** (local, with npm
2FA in hand — no npm token lives in CI secrets).

### Declaring a Change (contributors)

If your PR changes a published package (`core`, `help`, `mcp`, `completions`),
add a changeset alongside it:

```bash
pnpm changeset
```

Pick the affected package(s) and bump type, describe the change — the generated
`.changeset/*.md` file is committed with your PR. The four published packages
are a `fixed` group: they always version-bump together as one coherent
framework release.

> The repo is currently in changesets **pre-release mode** (`beta` tag), so
> versions resolve to `0.2.0-beta.N` and publishes land under the npm `beta`
> dist-tag; `latest` is untouched until `pnpm changeset pre exit`.

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

> **Note:** pnpm resolves `workspace:*` peer dependencies to real version
> ranges (e.g., `^0.2.0-beta.0`) during publish. You don't need to change them
> manually.

### Post-Publish Verification

```bash
# Verify versions and dist-tags (beta while in pre-mode; latest untouched)
npm view @runa-cmd/core dist-tags
npm view @runa-cmd/help dist-tags
npm view @runa-cmd/mcp dist-tags
npm view @runa-cmd/completions dist-tags

# Test installation in a fresh directory
mkdir /tmp/runa-test && cd /tmp/runa-test
npm init -y
npm install @runa-cmd/core@beta @runa-cmd/help@beta zod
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
