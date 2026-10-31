# Problemas conocidos

> **Verificado:** 2026-10-31, sobre `0.2.0-beta.0` compilada desde `main`.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-005 | Toda opción `z.array()` falla, incluso `--tag a` | Observado | No se usa `multiple` en `parseArgs` | [T-207](./backlog.md#t-207-opciones-repetidas-con-zarray) |
| KI-006 | En `defineCLI` con un comando, `completionsPlugin` rompe el modo implícito: `tool hola` da 127. Con `runCLI` no pasa | Observado | El modo depende de contar comandos | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-015 | En `defineCLI` con un comando, `tool tool` consume el dato como nombre. Con `runCLI` no pasa | Observado | `resolveCommandFromTree` | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |
| KI-016 | `--dark-color` no funciona para `darkColor` | Observado | La flag se arma directo desde la clave | [T-206](./backlog.md#t-206-kebab-case-por-defecto) |
| KI-021 | Booleanos con clave `noX`: `--no-cache` se interpreta como negación de `cache` | Observado | Comportamiento de `allowNegative` en `parseArgs` | [T-206](./backlog.md#t-206-kebab-case-por-defecto) |

## Severidad baja

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-036 | Con `completionsPlugin`, `completions` aparece como tool MCP, aunque a un agente no le sirve | Observado | Los comandos de un plugin se exponen como los del autor | [T-308](./backlog.md#t-308-comandos-de-plugins-fuera-de-las-tools) |
