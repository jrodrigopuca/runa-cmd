# `@runa-cmd/completions`

> **Fuente:** `packages/completions/src` · **Verificado:** 2026-10-30 · **Guía de uso:** `packages/completions/README.md`

Agrega un comando que genera scripts de autocompletado para bash, zsh y fish desde el schema.

## Uso

```ts
import { defineCLI } from '@runa-cmd/core';
import { completionsPlugin } from '@runa-cmd/completions';

defineCLI({
  meta: { name: 'mycli' },
  commands: { deploy },
  plugins: [completionsPlugin()],
}).run();
```

```bash
mycli completions bash
mycli completions zsh --instructions
```

`completionsPlugin({ commandName: 'complete' })` cambia el nombre del comando.

## API

| Export | Uso |
|---|---|
| `completionsPlugin(opts?)` | Plugin |
| `generateBashCompletions(schema, binName)` | Script de bash |
| `generateZshCompletions(schema, binName)` | Script de zsh |
| `generateFishCompletions(schema, binName)` | Script de fish |
| `getInstallInstructions(shell, binName)` | Instrucciones de instalación |

## Qué se completa

- Comandos y subcomandos.
- Flags largas, alias cortos y `--no-*` en booleanos.
- Valores de opciones `enum`.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `packages/completions/src/plugin.ts` | Registra el comando |
| `packages/completions/src/generators/bash.ts` | Bash, sin depender del paquete `bash-completion` |
| `packages/completions/src/generators/zsh.ts` | Zsh |
| `packages/completions/src/generators/fish.ts` | Fish |
| `packages/completions/src/generators/escape.ts` | Escape de textos para cada shell |
| `packages/completions/src/install.ts` | Instrucciones |

## Limitaciones

- Agregar este plugin rompe el modo implícito de comando único (KI-006).
- No completa rutas de archivo ([T-603](../backlog.md#t-603-completions-de-rutas-de-archivo)).
- PowerShell queda fuera de alcance.

Flujo: [completions](../flows/completions.md). Decisión: [ADR-0019](../adr/0019-completions-como-comando.md).
