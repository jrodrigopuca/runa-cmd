# `local-beacon` con `0.2.0-beta.5`

> **Fecha:** 2026-11-08. Documento histórico: no se actualiza.

**Pregunta:** ¿la beta.5 rompe algo, la redacción le cuesta algo al modelo, y una tool con guion funciona fuera de opencode?

**Respuesta:** no rompió nada, la redacción no cambia el comportamiento del modelo, y la tool con guion funciona en Claude Code. Todo lo midió el agente de `local-beacon`, que solo ve lo publicado en npm; acá se resume su reporte.

## Actualización

`local-beacon` pasó a `0.2.0-beta.5` desde npm sin cambiar código: tipos sin errores y 129 de 129 tests. Lo instalaron global desde un tarball, con Runa bajado de npm.

| Hallazgo | Resultado |
|---|---|
| F-08 | Resuelto: sin `--upstream`, `Missing required option: --upstream, or set OLLAMA_URL` y exit 2 |
| F-13 | Resuelto: con `defaultDescription`, la ayuda no muestra el home y el comando recibe la ruta real. El schema MCP no trae rutas |
| H6 | Sin probar: `local-beacon` no tiene comandos anidados ni hooks |

## F-14: la redacción no le cuesta nada al modelo

Corrigieron el supuesto de la tarea: con el proxy corriendo, `status` no incluye la ruta, así que `[redacted]` solo aparece en el error con el proxy apagado. Probaron ese caso.

Método: opencode 2.1.3 en Code Mode, `qwen3.5:9b` en Ollama, `lbeacon --mcp` instalado, y el prompt de [la validación anterior](./2026-11-local-beacon-real-model.md). 6 corridas con `LBEACON_SOCKET` fijado, que redacta la ruta, y 6 sin fijarlo, que la deja ver. Fue la única diferencia.

| | `[redacted]` | Ruta visible |
|---|---|---|
| Usó la tool | 6/6, una vez | 6/6, una vez |
| Reintentó | 0/6 | 0/6 |
| Interpretó bien el error | 5/6 | 5/6 |

La corrida que falló en cada tanda buscó Ollama en localhost, por el texto del error de `local-beacon`, no por la redacción. Con 6 corridas por tanda, esto descarta un efecto grande, no uno chico.

## Una tool con guion en otro cliente

Claude Code 2.1.319 con `claude-haiku-5-5`, sobre una CLI mínima con la beta.5 y dos comandos, `list-tags` y `total`. 6 corridas con `claude -p`, `--strict-mcp-config` y `--tools ""`; el prompt no nombraba la tool.

- La tool aparece como `mcp__dash__list-tags`, con el guion intacto.
- El modelo la llamó en 6 de 6 corridas, una vez y sin errores.
- La respuesta incluyó en 6 de 6 un valor que solo devuelve la tool.

No se probó Claude Desktop ni otra app de escritorio.

## Uso real

`lbeacon proxy` delante del Ollama remoto, en una tanda de un runner de agentes con tres tareas y `qwen3.5:9b`, con `lbeacon watch`, `status` y `requests` a mano.

- El proxy reenvió los 18 pedidos sin errores. Los tiempos quedaron dentro del rango de las corridas directas; con una corrida por tarea no se puede hablar de sobrecosto.
- Ctrl+C y `SIGINT` cortan bien, y `cleanup` borra el socket.
- Durante el uso sumaron una opción booleana `--all` a `requests` y a `watch`, y ampliaron un `z.enum` de `output`. CLI, `--json`, MCP y `testCLI()` tomaron los cambios sin rodeos. La parte MCP de este uso fue por `testCLI()` y por stdio, no con un modelo.
- Las cuatro fricciones que aparecieron eran de `local-beacon`, y ya las corrigieron.

## Lo que queda abierto, según ellos

- **F-05:** el README en npm. Se comprueba al publicar la 1.0 ([T-506](../backlog.md#t-506-salir-de-pre-release-y-publicar-100)).
- **F-07:** `Interrupted.` y 130 al terminar bien ([T-218](../backlog.md#t-218-parada-limpia-de-un-servicio)).
- **F-11:** `ctx.invocation`. Para Runa está cerrado por decisión: [ADR-0042](../adr/0042-lo-devuelto-llega-a-la-terminal.md) lo dejó sin hacer falta, porque `format` no corre por MCP. Se les avisó, y se reabre si tienen un caso.

## Límites

Un solo proyecto, una máquina y un modelo local para F-14. La tool con guion se probó en un cliente de terminal, no en uno de escritorio. El uso real fue una tanda de tres tareas.
