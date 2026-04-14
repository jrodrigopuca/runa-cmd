# Contributing to Runa

Thanks for your interest in contributing to Runa! This guide covers everything you need to get up and running.

## Prerequisites

- **Node.js** >= 18.3.0 (we target Node 22 LTS)
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

## Publishing to npm

> **For maintainers only.**

### Prerequisites

1. Be logged in to npm: `npm login`
2. Have access to the `@runa-cmd` organization on npmjs.com

### Pre-Publish Checklist

```bash
# 1. Ensure everything is clean
pnpm clean
pnpm build
pnpm test
pnpm lint
pnpm typecheck

# 2. Verify package contents (no test files, correct files included)
pnpm --filter @runa-cmd/core pack --dry-run
pnpm --filter @runa-cmd/help pack --dry-run
pnpm --filter @runa-cmd/mcp pack --dry-run
pnpm --filter @runa-cmd/completions pack --dry-run

# 3. Verify you're logged in
npm whoami
```

### Publishing

Packages must be published in dependency order — **core first**, then the rest:

```bash
# 1. Publish core (no deps on other @runa-cmd packages)
pnpm --filter @runa-cmd/core publish --no-git-checks

# 2. Publish the rest (they depend on core)
pnpm --filter @runa-cmd/help publish --no-git-checks
pnpm --filter @runa-cmd/mcp publish --no-git-checks
pnpm --filter @runa-cmd/completions publish --no-git-checks
```

> **Note:** pnpm automatically resolves `workspace:*` peer dependencies to real version ranges (e.g., `^0.1.0`) during publish. You don't need to manually change them.

### Post-Publish Verification

```bash
# Verify packages are available
npm view @runa-cmd/core version
npm view @runa-cmd/help version
npm view @runa-cmd/mcp version
npm view @runa-cmd/completions version

# Test installation in a fresh directory
mkdir /tmp/runa-test && cd /tmp/runa-test
npm init -y
npm install @runa-cmd/core @runa-cmd/help zod
```

### Version Bumping

When releasing a new version:

1. Update `version` in each package's `package.json`
2. Keep versions **in sync** across all packages
3. Commit: `chore: bump version to x.y.z`
4. Tag: `git tag vx.y.z`
5. Push with tags: `git push && git push --tags`

## Questions?

Open an issue or start a discussion on the [GitHub repo](https://github.com/jrodrigopuca/runa-cmd).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
