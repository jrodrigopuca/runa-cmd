# `local-beacon` con `0.2.0-beta.3` y un modelo real

> **Fecha:** 2026-11-02. Documento histórico: no se actualiza.

**Pregunta:** ¿`0.2.0-beta.3` resolvió lo reportado, y MCP funciona con un modelo real?

**Respuesta:** sí. Los bloqueantes de `0.2.0-beta.2` están resueltos, y un modelo real usó las tools sin que se las nombraran. La validación cubre un solo cliente y un solo modelo.

## Método

El mismo evaluador migró `local-beacon` y `notes` viendo solo lo publicado. Después corrió 24 pruebas con `opencode` 2.1.3 y `qwen3.5:9b`, en Ollama 0.40.13 en otra máquina, con servidores `lbeacon --mcp` y `notes --mcp`, sin nombrar ninguna tool en el prompt.

Del lado de Runa se contrastaron los 24 logs: son 24 archivos, y las 12 corridas con el proxy apagado tienen un solo error de la tool. Las 2 corridas que dieron la vuelta usaron `fetch`. No se repitió ninguna corrida, ni se contrastó cada conteo.

## Resultado con el modelo

| Pregunta | Resultado |
|---|---|
| ¿Llamó las tools por su cuenta? | Sí, 24 de 24 |
| ¿Recibió el resultado completo? | Sí en tags y versión, 12 de 12. Los conteos de pedidos no se contrastaron |
| ¿Acepta una tool con guión? | Sí, 6 de 6, pero en Code Mode: `tools.notes["list-tags"]()`. No se probó como función del proveedor |
| ¿Reintentó ante un error? | Nunca: 12 de 12 hicieron una sola llamada |

`opencode` ofrece un único tool `execute`, y el modelo escribe JavaScript. `_meta['runa/error']` no llegó al modelo: solo el texto.

Lo que hizo el modelo depende del mensaje del autor:

| Mensaje | Culpó a Ollama | Paró y pidió ayuda | Dio la vuelta |
|---|---|---|---|
| `...not running... Start it with: lbeacon proxy` | 5 de 6 | 6 de 6 | 0 |
| Con: `This says nothing about the ollama server, which may be fine.` | 0 de 6 | 4 de 6 | 2 de 6 |

Las 2 corridas que dieron la vuelta consultaron `localhost:11434`, que es otra máquina, y respondieron con seguridad sobre el servidor equivocado. Ese `fetch` es del cliente: Runa no puede evitarlo.

**Lectura:** [ADR-0044](../adr/0044-runa-no-opina-sobre-reintentos.md) resistió: sin `safeToRetry`, ningún modelo repitió la llamada. Eso sí, 12 corridas con un cliente y un modelo no prueban que nunca pase.

## Migración

Se hizo con el `CHANGELOG` y los README. `testCLI()` borró 31 líneas de parches en `notes`, corrió 5 casos en 29 ms en `local-beacon`, y expuso una salida duplicada que el harness anterior no veía.

Faltó explicar tres cosas:

- `--json` imprime lo que devuelve `run()`: en `requests` pasó de un array a `{ "requests": [...] }`.
- `testCLI()` necesita importar la CLI sin arrancarla, así que hay que separar `cli.run()` de la definición.
- La misma sección de cambios se repite en los cuatro `CHANGELOG`, y no se sabe a qué paquete toca cada cambio. Es efecto del grupo `fixed`.

## Nuevos y abiertos

| ID | Hallazgo | Contraste | Tarea |
|---|---|---|---|
| N1 | `format()` no recibe las opciones, así que una opción de presentación viaja en el resultado | Leído: `format?: (result) => string` | [T-228](../backlog.md#t-228-format-recibe-las-opciones) |
| N2 | `--limit 0` expone la clave, y desde el archivo nombra origen y clave | Sin contrastar | [T-227](../backlog.md#t-227-detalles-de-ayuda-y-errores) |
| H6 | `tag add` y `add` no se distinguen en hooks | Ya registrado | [T-226](../backlog.md#t-226-ruta-completa-en-hooks-y-middleware) |
| H4 | `cli.run()` termina el proceso para quien embebe la CLI | Reproducido antes; `testCLI()` solo cubre pruebas | Sin tarea: nadie lo pidió por fuera de testing |
| — | `completions` se expone como tool | Ya registrado | [T-308](../backlog.md#t-308-comandos-de-plugins-fuera-de-las-tools) |

## Sin probar

Una tool con guión como función del proveedor, otro cliente u otro modelo, `cancel` iniciado por el modelo, `readOnlyHint` como permiso, y `output_too_large`.
