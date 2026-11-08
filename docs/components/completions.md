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
- Lo mismo después de un posicional o del valor de una opción, como `greet hello Ana --lang <TAB>` (T-240). En bash, una palabra entra en la ruta del comando solo si nombra un comando en ese punto, y se saltea la que sigue a una opción con valor, así que `--lang plain` no lleva al comando `plain`. Las listas son strings y no arrays, para que corra en el bash 3.2 de macOS. En zsh, cada comando declara sus posicionales en `_arguments`, como `'1:name:'`, porque sin eso `_arguments` no sabe dónde poner `Ana` y deja de completar. fish no lo necesita: `__fish_seen_subcommand_from` no depende de las palabras del medio. Pero con `-r -a`, fish ofrecía también los archivos de la carpeta junto a los valores de un enum, y el CI lo mostró: un enum usa `-x`, que es `-r` y `-f`, y solo lista sus valores. Una opción de texto sigue con `-r`, porque su valor puede ser una ruta.

El script de zsh funciona en `fpath` y con `eval`, después de `compinit`. Las pruebas en `shells.test.ts` lo ejecutan en bash, zsh y fish reales, con TAB en una terminal para zsh, porque `zsh -n` no ve un spec roto. En CI son obligatorias en Linux, con `RUNA_REQUIRE_SHELLS`; en local, se omite el shell que falte.

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

- Con `runCLI`, las opciones del comando raíz se completan en el nivel superior, y el comando no se lista como subcomando.
- No completa rutas de archivo ([T-603](../backlog.md#t-603-completions-de-rutas-de-archivo)).
- PowerShell queda fuera de alcance.

Flujo: [completions](../flows/completions.md). Decisión: [ADR-0019](../adr/0019-completions-como-comando.md).
