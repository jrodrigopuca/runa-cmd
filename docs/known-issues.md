# Problemas conocidos

> **Verificado:** 2026-11-15, sobre `core` 1.1.0 publicada. El valor después de `--no-x`, que se ignoraba, se resolvió en esa versión (T-266). El README vacío en `npm view` se resolvió con la publicación de la 1.0.0: el campo `readme` del registro tiene el texto en los cinco paquetes.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

No hay problemas abiertos de esta severidad.

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-050 | Por MCP, un comando que imprime el motivo y fija `process.exitCode` en vez de lanzar se informa como `after_run_failed`, con `effect: completed` y `The command already ran.`: el modelo lee que falló algo posterior al comando, no el comando. El workaround es lanzar un `CommandError`, que llega como `command_failed` | Observado el 2026-11-09 con el cliente oficial del SDK de MCP, sobre el `dist` de la 1.0.0 | `findFailure`, en `packages/mcp/src/server.ts`: si `run()` devolvió y el exit code no es 0, lo toma como una falla después de `run()` | [T-264](./backlog.md#t-264-un-exit-code-fijado-a-mano-por-mcp) |

## Severidad baja

No hay problemas abiertos de esta severidad.
