# Problemas conocidos

> **Verificado:** 2026-11-09, sobre la 1.0.0 publicada. El README vacío en `npm view` se resolvió con la publicación de la 1.0.0: el campo `readme` del registro tiene el texto en los cinco paquetes.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-051 | `--no-x=<valor>` en un booleano no da error y descarta el valor: la opción queda en su default, con exit 0. `--no-css=true` deja `css: true`, lo contrario de lo pedido, y `--no-css=banana` también pasa. Contradice [ADR-0028](./adr/0028-coercion-booleana.md), que rechaza con exit 2 cualquier valor fuera de `true`, `false`, `1` y `0` | Observado el 2026-11-09 sobre el `dist` de la 1.0.0, con `css: z.boolean().default(true)`: `--no-css=false`, `=true` y `=banana` dan `css: true` y exit 0; `--no-css` y `--css=false` dan `false` | Con `allowNegative`, `parseArgs` de Node solo convierte `--no-css` en `css: false` sin valor: con `=valor` devuelve una clave aparte, `{"no-css": "<valor>"}`, que se observó. La guarda de `assertKnownOptions`, en `packages/core/src/parse/strict.ts`, deja pasar toda clave `no-<booleano>` porque supone que "nunca aparecen hoy", y esa clave no llega a ninguna opción: esto último es leído | [T-266](./backlog.md#t-266-un-valor-después-de---no-x-es-un-error-de-uso) |

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-050 | Por MCP, un comando que imprime el motivo y fija `process.exitCode` en vez de lanzar se informa como `after_run_failed`, con `effect: completed` y `The command already ran.`: el modelo lee que falló algo posterior al comando, no el comando. El workaround es lanzar un `CommandError`, que llega como `command_failed` | Observado el 2026-11-09 con el cliente oficial del SDK de MCP, sobre el `dist` de la 1.0.0 | `findFailure`, en `packages/mcp/src/server.ts`: si `run()` devolvió y el exit code no es 0, lo toma como una falla después de `run()` | [T-264](./backlog.md#t-264-un-exit-code-fijado-a-mano-por-mcp) |

## Severidad baja

No hay problemas abiertos de esta severidad.
