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
| KI-033 | Si `output` falla, un comando con efectos vuelve como error, y el modelo puede repetirlo | Leído | El informe `ran` llega al servidor, pero `toToolResult` todavía no lo usa | [T-304](./backlog.md#t-304-contrato-de-resultado-y-errores) |
| KI-005 | Toda opción `z.array()` falla, incluso `--tag a` | Observado | No se usa `multiple` en `parseArgs` | [T-207](./backlog.md#t-207-opciones-repetidas-con-zarray) |
| KI-006 | En `defineCLI` con un comando, `completionsPlugin` rompe el modo implícito: `tool hola` da 127. Con `runCLI` no pasa | Observado | El modo depende de contar comandos | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |
| KI-007 | No se pueden excluir comandos de MCP ni marcarlos como destructivos | Leído | `McpPluginOptions` no lo ofrece | [T-302](./backlog.md#t-302-excluir-y-anotar-tools) |

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-009 | `runCLI` no tiene `--help`: da `Unknown option: --help` y exit 2 | Observado | La ayuda solo existe en `@runa-cmd/help` | [T-204](./backlog.md#t-204---help-en-core-reemplazable) |
| KI-011 | La ayuda raíz de un comando único muestra `<command>` y oculta argumentos y opciones | Observado | `renderCLI` trata todo como árbol | [T-205](./backlog.md#t-205-ruteo-único-para-la-ayuda) |
| KI-012 | `tool db migrate --help` muestra la ayuda de `db` | Observado | `resolveTarget` solo busca en el primer nivel | [T-205](./backlog.md#t-205-ruteo-único-para-la-ayuda) |
| KI-013 | Un CLI multi-comando sin argumentos da 127 en vez de mostrar la ayuda | Observado | `resolveCommand` lanza un error | [T-205](./backlog.md#t-205-ruteo-único-para-la-ayuda) |
| KI-014 | Un `-h` en cualquier comando tira todo el CLI si hay `helpPlugin` | Observado | `validateOptionCollisions` no distingue flags integradas | [T-204](./backlog.md#t-204---help-en-core-reemplazable) |
| KI-015 | En `defineCLI` con un comando, `tool tool` consume el dato como nombre. Con `runCLI` no pasa | Observado | `resolveCommandFromTree` | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |
| KI-016 | `--dark-color` no funciona para `darkColor` | Observado | La flag se arma directo desde la clave | [T-206](./backlog.md#t-206-kebab-case-por-defecto) |
| KI-021 | Booleanos con clave `noX`: `--no-cache` se interpreta como negación de `cache` | Observado | Comportamiento de `allowNegative` en `parseArgs` | [T-206](./backlog.md#t-206-kebab-case-por-defecto) |

## Severidad baja

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-030 | En MCP, un `output` inválido llega al agente como JSON crudo de Zod | Leído | `outputSchema.parse` en `packages/mcp/src/server.ts:102` | [T-304](./backlog.md#t-304-contrato-de-resultado-y-errores) |
