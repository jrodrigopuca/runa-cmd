# Problemas conocidos

> **Verificado:** 2026-10-30, sobre `0.2.0-beta.0` compilada desde `main`.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-001 | `cleanup` y `plugin.cleanup()` no corren ante un error no manejado | Observado | `process.exit` antes del `finally`, en `packages/core/src/cli.ts:451`; los tests lo mockean | [T-101](./backlog.md#t-101-cleanup-corre-también-ante-errores) |
| KI-002 | Un booleano con `.default()` ignora env y config sin avisar: `MINIFY=true` da `false` | Observado | `packages/core/src/parse/parseargs-bridge.ts:82` pasa el default a `parseArgs`, que le gana a env y config | [T-102](./backlog.md#t-102-booleanos-desde-env-y-config) |
| KI-003 | MCP pierde la salida de `console.log`, y esa salida ensucia el canal JSON-RPC | Observado | `packages/mcp/src/server.ts:91` ejecuta `run()` sin capturar stdout | [T-301](./backlog.md#t-301-capturar-la-salida-de-los-comandos) |
| KI-004 | Una CLI de un comando con `runCLI` no puede usar `--mcp` ni ningún plugin | Leído | `packages/core/src/cli.ts:528` no recibe plugins | [T-203](./backlog.md#t-203-runcli-con-plugins-y-modo-raíz-explícito) |
| KI-005 | Toda opción `z.array()` falla, incluso `--tag a` | Observado | No se usa `multiple` en `parseArgs` | [T-207](./backlog.md#t-207-opciones-repetidas-con-zarray) |
| KI-006 | `completionsPlugin` rompe el modo de comando único: `tool hola` da 127 | Observado | El modo depende de contar comandos | [T-203](./backlog.md#t-203-runcli-con-plugins-y-modo-raíz-explícito) |
| KI-007 | No se pueden excluir comandos de MCP ni marcarlos como destructivos | Leído | `McpPluginOptions` no lo ofrece | [T-302](./backlog.md#t-302-excluir-y-anotar-tools) |
| KI-008 | MCP saltea middleware, hooks, env y config sin avisar | Leído | `packages/mcp/src/server.ts:91` llama a `run()` directo | [T-303](./backlog.md#t-303-definir-qué-corre-en-una-llamada-mcp) |

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-009 | `runCLI` no tiene `--help`: da `Unknown option: --help` y exit 2 | Observado | La ayuda solo existe en `@runa-cmd/help` | [T-204](./backlog.md#t-204---help-en-core-reemplazable) |
| KI-010 | No existe `--version`, aunque haya `meta.version` | Observado | No está implementado, y `runCLI` descarta el campo | [T-201](./backlog.md#t-201---version-integrado) |
| KI-011 | La ayuda raíz de un comando único muestra `<command>` y oculta argumentos y opciones | Observado | `renderCLI` trata todo como árbol | [T-205](./backlog.md#t-205-ruteo-único-para-la-ayuda) |
| KI-012 | `tool db migrate --help` muestra la ayuda de `db` | Observado | `resolveTarget` solo busca en el primer nivel | [T-205](./backlog.md#t-205-ruteo-único-para-la-ayuda) |
| KI-013 | Un CLI multi-comando sin argumentos da 127 en vez de mostrar la ayuda | Observado | `resolveCommand` lanza un error | [T-205](./backlog.md#t-205-ruteo-único-para-la-ayuda) |
| KI-014 | Un `-h` en cualquier comando tira todo el CLI si hay `helpPlugin` | Observado | `validateOptionCollisions` no distingue flags integradas | [T-204](./backlog.md#t-204---help-en-core-reemplazable) |
| KI-015 | `tool tool` consume el dato como nombre del comando | Observado | `resolveCommandFromTree` | [T-203](./backlog.md#t-203-runcli-con-plugins-y-modo-raíz-explícito) |
| KI-016 | `--dark-color` no funciona para `darkColor` | Observado | La flag se arma directo desde la clave | [T-206](./backlog.md#t-206-kebab-case-por-defecto) |
| KI-017 | `tool -- -text` no llena el posicional | Observado | Lo posterior a `--` se separa antes de parsear | [T-202](./backlog.md#t-202----llena-posicionales) |
| KI-018 | Un booleano sin default rechaza `MINIFY=true` | Observado | Falta coerción a booleano | [T-102](./backlog.md#t-102-booleanos-desde-env-y-config) |
| KI-019 | `types.test-d.ts` no corre en `pnpm test` ni en CI | Observado | Falta `--typecheck`, y `tsc` excluye los tests | [T-002](./backlog.md#t-002-type-tests-en-ci) |
| KI-020 | `hint` no se usa, y `deprecated` no avisa al ejecutar | Leído | Solo se copian al schema; la ayuda muestra `deprecated` | [T-108](./backlog.md#t-108-resolver-metadatos-sin-efecto) |
| KI-021 | Booleanos con clave `noX`: `--no-cache` se interpreta como negación de `cache` | Observado | Comportamiento de `allowNegative` en `parseArgs` | [T-206](./backlog.md#t-206-kebab-case-por-defecto) |

## Severidad baja

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-022 | Falta de valor reportada como tipo inválido: `tool hola -e`, `--label`, `--offset` | Observado | `parseArgs` no estricto devuelve `true` | [T-104](./backlog.md#t-104-avisar-cuando-falta-el-valor-de-una-opción) |
| KI-023 | Sugerencias irrelevantes: `--nope` sugiere `--size` | Observado | Umbral fijo de 3 en `packages/core/src/suggest.ts:64` | [T-105](./backlog.md#t-105-sugerencias-de-typo-proporcionales) |
| KI-024 | Un posicional de más en un comando sin args da exit 1, no 2 | Observado | Sale un error propio de `parseArgs` | [T-103](./backlog.md#t-103-errores-de-uso-consistentes) |
| KI-025 | Un `output` inválido vuelca JSON crudo de Zod | Observado | `command.output.parse` sin humanizar | [T-103](./backlog.md#t-103-errores-de-uso-consistentes) |
| KI-026 | `--minify=false` da exit 2 | Observado | `parseArgs` no estricto lo entrega como string | [T-103](./backlog.md#t-103-errores-de-uso-consistentes) |
| KI-027 | La ayuda muestra `[default: false]`, y el error repite el nombre del argumento | Observado | `render.ts` y `resolve.ts` | [T-106](./backlog.md#t-106-mensajes-y-ayuda-sin-ruido) |
| KI-028 | Los tres plugins declaran `version: '0.1.0'` fijo | Leído | Literal en cada `plugin.ts` | [T-107](./backlog.md#t-107-versión-real-en-los-plugins) |
| KI-029 | Los READMEs dicen `Stable`, 518 tests, Node 18.3+ y `text: "ok"` | Leído | Quedaron desactualizados | [T-003](./backlog.md#t-003-documentación-fiel-al-estado-real) |
