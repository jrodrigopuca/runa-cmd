# Runa — Research & Competitive Analysis

> Documento histórico, previo a la primera versión. Sus comparaciones describen la intención de entonces: varias funciones de Runa que menciona no existen. El estado real está en [status.md](../status.md).

> **Name**: Runa (`@runa-cmd` on npm)
> **Meaning**: Runes are symbols with power. Define the schema (the rune), and the CLI manifests.
> **Goal**: Build a schema-driven, TypeScript-first CLI framework that is competitively superior to Commander.js
> **Philosophy**: Like Zod changed validation — schema is the source of truth for types, help, completions, MCP, and more.

---

## 1. Competitive Landscape

| Library | Stars | Strengths | Key Weakness |
|---|---|---|---|
| **Commander.js** | 28.1k | Battle-tested, huge ecosystem, simple API | NO type inference, NO plugins, NO MCP, NO interactive prompts, barely migrating to ESM (v15, May 2026) |
| **Yargs** | 11.5k | Feature-rich, middleware support | Heavy, weak types, no formal plugin system |
| **oclif** | 9.5k | Enterprise-grade (Salesforce), plugin system | Overkill for simple CLIs, class-based, heavy |
| **CAC** | 3k | Lightweight, simple | Limited features, no plugin system |
| **Citty/UnJS** | 1.2k | Most modern (zero-dep, `util.parseArgs`), recently added basic plugins | Immature, plugin system is basic |
| **@effect/cli** | — | Type-safe, has wizard mode | Requires adopting the entire Effect ecosystem |
| **Caporal.js** | — | Was promising | Abandoned/unmaintained |

### Commander.js Open Issues (validated community pain)

- **#2505**: RFC Plugin API — explicit community request (Apr 2026)
- **#2446**: Async exitOverride
- **#2346**: Auto-resolution of package.json fields
- **#2345/#2487**: ESM migration (still in progress for v15)

---

## 2. Commander.js Limitations

1. **Type Safety** — Manual types (`.d.ts`), no schema inference
2. **Plugin System** — Non-existent after 13+ years
3. **Interactive Prompts** — Requires external deps (inquirer, prompts)
4. **Config File Resolution** — No merge of CLI args + env vars + config files
5. **Modern Output/UI** — Plain text help, no colors, no rich formatting
6. **Runtime Agnostic** — No official Deno/Bun/Browser support
7. **Testing Support** — Zero built-in testing utilities

---

## 3. Growth Niches (Unexplored by Commander)

1. **AI-Friendly CLI** — Structured output, machine-readable help, native MCP server mode
2. **Schema-as-Source-of-Truth** — One Zod schema generates: help, completions, types, MCP tools, JSON schema
3. **Progressive Enhancement** — Headless → Pretty → Interactive → TUI as layers
4. **Config Layering** — CLI args > env vars > config files > defaults (like c12 but built-in)
5. **Composable Commands** — Middleware pattern for CLIs

---

## 4. Key Competitive Advantages (Runa vs Field)

### Plugin System Comparison

| Feature | Runa | oclif | Citty | Commander |
|---|---|---|---|---|
| Plugin definition | Function | Class + package.json | Function | ❌ None |
| Lifecycle hooks | 7 hooks | String-based hooks | setup/cleanup only | ❌ None |
| Type-safe context | ✅ Full inference | ❌ Manual types | ❌ No context | ❌ N/A |
| Add commands | ✅ `addCommand()` | ✅ File convention | ❌ Not supported | ❌ N/A |
| Add global options | ✅ `addGlobalOption()` | ❌ Not supported | ❌ Not supported | ❌ N/A |
| Lazy loading | ✅ Dynamic import | ✅ JIT plugins | ✅ Async imports | ❌ N/A |
| Dependencies | ✅ Declared | ❌ Manual ordering | ❌ Not supported | ❌ N/A |
| Discovery | ✅ Convention-based | ✅ Package manifest | ❌ Not supported | ❌ N/A |

### MCP / AI Comparison

| Feature | Runa | Commander | oclif | Citty |
|---|---|---|---|---|
| MCP generation | ✅ One-line plugin | ❌ None | ❌ None | ❌ None |
| Structured output | ✅ Schema-driven | ❌ Manual | ❌ Manual | ❌ None |
| Machine-readable help | ✅ JSON schema | ❌ Text only | ❌ Text only | ❌ Text only |
| Introspection API | ✅ `getSchema()` | ❌ None | Partial (manifest) | ❌ None |
| Output validation | ✅ Zod output schema | ❌ None | ❌ None | ❌ None |
| AI compatibility | ✅ Native | ❌ None | ❌ None | ❌ None |

### Key Discovery: MCP SDK v2 Alignment

The official `@modelcontextprotocol/server` v2 SDK uses **Standard Schema** (Zod v4, Valibot, ArkType) for tool definitions. Our Zod schemas are DIRECTLY compatible with `server.registerTool()`. Zero conversion needed.

---

## 5. References

- [Commander.js](https://github.com/tj/commander.js) — Main competitor, issues #2505, #2446, #2346, #2345, #2487
- [Yargs](https://github.com/yargs/yargs)
- [CAC](https://github.com/cacjs/cac)
- [oclif](https://github.com/oclif/oclif) — Plugin system reference (heavyweight, class-based)
- [oclif/core Plugin interface](https://github.com/oclif/core/blob/main/src/interfaces/plugin.ts) — Studied for plugin design
- [Effect CLI](https://github.com/Effect-TS/effect/tree/main/packages/cli)
- [Citty/UnJS](https://github.com/unjs/citty) — Most relevant modern competitor, studied plugin/hooks design
- [MCP TypeScript SDK v2](https://github.com/modelcontextprotocol/typescript-sdk) — Uses Standard Schema (Zod v4), key for MCP integration
- [MCP Server Guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) — registerTool API, transports, annotations
- [Standard Schema](https://standardschema.dev/) — Cross-library schema interface (Zod, Valibot, ArkType)
- [Poppinss CLI UI](https://github.com/poppinss/cliui) — Reference for CLI UI/testing, raw mode pattern for test assertions
- [Lipgloss](https://github.com/charmbracelet/lipgloss) — CSS-like terminal styling (Go, 11k ⭐). Inspiration for layout primitives (box, join, styled, table, list, tree). Auto color downsampling.
- [Gum](https://github.com/charmbracelet/gum) — Lipgloss as shell commands (23k ⭐). Shows which CLI UI primitives users want most.
- [Drizzle Kit](https://github.com/drizzle-team/drizzle-orm/tree/main/drizzle-kit) — Real-world CLI reference
