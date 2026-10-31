# `@runa-cmd/help`

> **Fuente:** `packages/help/src` · **Verificado:** 2026-10-30 · **Guía de uso:** `packages/help/README.md`

Reemplaza la ayuda en texto plano de `core` por una con tema y layout, y ofrece primitivas para cualquier salida de terminal. `core` decide cuándo corre la ayuda y sobre qué: `--help` funciona sin este paquete.

## Uso

```ts
import { defineCLI } from '@runa-cmd/core';
import { helpPlugin } from '@runa-cmd/help';

defineCLI({
  meta: { name: 'mycli', version: '1.0.0' },
  commands: { deploy },
  plugins: [helpPlugin()],
}).run();
```

## Opciones de `helpPlugin`

| Opción | Tipo | Efecto |
|---|---|---|
| `theme` | `Partial<Theme>` | Sobrescribe colores del tema por defecto |
| `render` | `(ctx: RenderFnCtx) => string` | Reemplaza el renderer |
| `exitOnHelp` | `boolean` | Llama a `process.exit(0)` tras renderizar; `false` por defecto |

Tres niveles de personalización:

1. **Sin configuración:** `helpPlugin()`.
2. **Tema:** `helpPlugin({ theme: { primary: '#7D56F4' } })`.
3. **Render propio:** `helpPlugin({ render: ({ schema, theme }) => '...' })`.

`RenderFnCtx` contiene `schema`, `theme`, `colorDepth` y `termWidth`.

## Primitivas

No dependen del plugin y se pueden usar en cualquier comando.

| Export | Uso |
|---|---|
| `styled(text, opts, ctx?)` | Color y estilo |
| `box(opts, ctx?)` | Caja con borde; el contenido va en `opts` |
| `join.vertical(blocks, opts?)`, `join.horizontal(blocks, opts?)` | Composición |
| `table(rows, opts?)` | Tabla |
| `list(items, opts?)` | Lista |
| `columns(blocks, opts?, ctx?)` | Columnas |

Las firmas exactas están en `packages/help/src/primitives/`. Todo devuelve un `Block`, que es un string con ANSI.

## Color y terminal

| Export | Uso |
|---|---|
| `detectColorDepth()`, `detectTermWidth()` | Detección |
| `getRenderContext()`, `resetRenderContext()` | Contexto en caché; el reset es para tests |
| `downsampleColor(color, depth)` | Degrada un color |
| `strip(text)`, `visibleWidth(text)` | Quita ANSI y mide ancho |
| `bold`, `dim`, `italic`, `underline`, `fg`, `reset` | Códigos ANSI |

Tema por defecto: `primary`, `secondary`, `muted`, `error`, `warning` y `success`. Los colores deben ser `#RRGGBB` o un atributo como `dim`.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `packages/help/src/plugin.ts` | Reemplaza la ayuda de `core` con `api.replaceHelp` |
| `packages/help/src/render.ts` | Renderer por defecto |
| `packages/help/src/theme.ts` | Tema y resolución de colores |
| `packages/help/src/ansi/` | Códigos, detección y degradado |
| `packages/help/src/primitives/` | Primitivas de layout |

## Limitaciones

- `visibleWidth` no contempla CJK ni emoji ([T-602](../backlog.md#t-602-ancho-correcto-para-cjk-y-emoji)).
- `#RGB` no se acepta ([T-604](../backlog.md#t-604-rgb-en-temas)).

Flujo: [ayuda](../flows/help-rendering.md). Decisiones: [ADR-0018](../adr/0018-bloques-y-primitivas-de-layout.md), [ADR-0021](../adr/0021-help-y-version-en-core.md).
