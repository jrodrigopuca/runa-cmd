# Instrucciones para agentes

Runa es un framework de CLIs en TypeScript: un comando, para personas y agentes.

**Antes de cambiar nada, leé [`docs/README.md`](./docs/README.md) y [`docs/process.md`](./docs/process.md).** `docs/` es la fuente de verdad.

## Ciclo obligatorio

Documentar, probar, codificar, probar, verificar y documentar. El detalle está en [`docs/process.md`](./docs/process.md).

- La tarea sale de [`docs/backlog.md`](./docs/backlog.md) y sus criterios definen cuándo está lista.
- Antes de una decisión difícil de revertir, leé [`docs/adr/README.md`](./docs/adr/README.md) y citá lo decidido.
- Un ADR aceptado no se edita: se reemplaza con uno nuevo.
- Revisá [`docs/known-issues.md`](./docs/known-issues.md) antes de diagnosticar un problema.

## Comandos

```bash
pnpm install
pnpm build          # los paquetes consumen el dist de core
pnpm test
pnpm typecheck
pnpm lint
pnpm docs:check
```

## Reglas del repo

- Trabajamos sobre `main`. Commit y push solo cuando la persona lo pida.
- `core` no tiene dependencias de runtime, y nunca depende de un plugin.
- `._zod` solo aparece en `packages/core/src/parse/adapters/zod-v4.ts`.
- Los paquetes publicados llevan changeset. Publicar es manual.
- Commits con Conventional Commits, usando `core`, `help`, `mcp`, `completions`, `demo` o `docs` como alcance.
