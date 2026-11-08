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

`exitOnHelp` se retiró en la `0.2.0-beta.7` ([ADR-0047](../adr/0047-ningun-plugin-termina-el-proceso-con-la-ayuda.md)): el plugin nunca termina el proceso, y `core` decide el exit code. Si una CLI en JS todavía la pasa, el plugin lo avisa por stderr al arrancar, y sigue.

Tres niveles de personalización:

1. **Sin configuración:** `helpPlugin()`.
2. **Tema:** `helpPlugin({ theme: { primary: '#7D56F4' } })`.
3. **Render propio:** `helpPlugin({ render: ({ schema, theme }) => '...' })`.

`RenderFnCtx` contiene `schema`, `theme`, `colorDepth` y `termWidth`.

## Primitivas

No dependen del plugin y se pueden usar en cualquier comando.

| Export | Uso |
|---|---|
| `styled(text, opts, ctx?)` | Color y estilo. Con `colorDepth: 'none'` no escribe ningún código ANSI, y conserva el padding |
| `box(opts, ctx?)` | Caja con borde; el contenido va en `opts` |
| `join.vertical(blocks, opts?)`, `join.horizontal(blocks, opts?)` | Composición |
| `table(rows, opts?)` | Tabla |
| `list(items, opts?)` | Lista |
| `columns(blocks, opts?, ctx?)` | Columnas |

Las firmas exactas están en `packages/help/src/primitives/`. Todo devuelve un `Block`, que es un string con ANSI.

## Color y terminal

| Export | Uso |
|---|---|
| `detectColorDepth(stream?)`, `detectTermWidth()` | Detección. El plugin pregunta por el stream donde escribe |
| `getRenderContext()`, `resetRenderContext()` | Contexto en caché; el reset es para tests |
| `downsampleColor(color, depth)` | Degrada un color |
| `strip(text)`, `visibleWidth(text)` | Quita ANSI y mide ancho |
| `bold`, `dim`, `italic`, `underline`, `fg`, `reset` | Códigos ANSI |

Tema por defecto: `primary`, `secondary`, `muted`, `error`, `warning` y `success`. Los colores deben ser `#RRGGBB` o un atributo como `dim`. El renderer por defecto no tiene colores fijos: `primary` colorea los títulos y los nombres de comando; `secondary`, las flags, los argumentos y `(required)`; `muted`, `[default: …]` y `[env: …]`; `warning`, `(deprecated: …)`. `error` y `success` no los usa, porque la ayuda no muestra errores ni éxitos: llegan a un renderer propio con el resto del tema (T-238). `theme-slots.test.ts` prueba cada uno.

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
