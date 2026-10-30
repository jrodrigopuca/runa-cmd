# Ideas aparcadas

Estas ideas se diseñaron en el spec original, pero **no existen en el código**. Se conservan para no perder el razonamiento. Para retomar una, hace falta un pedido real y una tarea en el [backlog](./backlog.md).

## `@runa-cmd/testing`

Utilidades para probar CLIs sin lanzar procesos. Es lo más alineado con el diferencial, porque ninguna librería comparada las ofrece integradas.

| Utilidad | Para qué | Devuelve |
|---|---|---|
| `parseDry(cmd, argv)` | Probar parseo sin ejecutar | `args`, `options`, `errors` |
| `runDry(cli, argv)` | Ejecutar con salida capturada y sin ANSI | `exitCode`, `stdout`, `stderr`, `output`, `error`, `duration` |
| `createTestCLI(cli, { env, config, argv })` | Probar la CLI completa con entorno simulado | Lo anterior, más `hooks` y `middleware` |

Si se construye, conviene considerarlo junto con la guía de testing de [T-503](./backlog.md#t-503-documentación-de-v1).

## Ayuda legible por máquinas

`mycli --help --json` devolvería el schema en JSON. `getSchema()` ya lo produce. Sirve para agentes con shell, que hoy pueden leer la ayuda pero no un formato estructurado.

## Salida estructurada por CLI

El spec preveía que un comando con `output` imprimiera su resultado de forma legible al usarse como CLI. Hoy `core` valida el retorno y no lo imprime. Una flag `--json` lo cerraría, y le daría a los agentes la misma salida tipada que MCP.

## Otros paquetes

| Paquete | Idea |
|---|---|
| `@runa-cmd/prompts` | Preguntar los valores faltantes |
| `@runa-cmd/config-ts` y `@runa-cmd/config-yaml` | Loaders adicionales |
| `@runa-cmd/create-runa` | Generador con `npm create runa` |
| `@runa-cmd/ui` | Spinners y barras de progreso |

## Otras ideas

- **Descubrimiento de plugins** por convención de nombre (`runa-plugin-*`).
- **Bun y Deno** con soporte formal. Hoy solo se prueba Node.
- **Otras librerías de schemas**, como Valibot o ArkType. Requiere una costura de validación ([ADR-0010](./adr/0010-schema-adapter.md)).
- **Paquete Unicode para ayuda.** Hoy se plantea resolverlo en [T-602](./backlog.md#t-602-ancho-correcto-para-cjk-y-emoji).
- **Filtrado de salida en MCP.** Las respuestas grandes consumen contexto del agente, y no se pueden filtrar como una tubería de shell.
