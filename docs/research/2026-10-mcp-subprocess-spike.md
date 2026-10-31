# Prototipo: tools MCP en subproceso

> **Fecha:** 2026-10-30. Documento histórico: no se actualiza. El código del prototipo vivía fuera del repo y no se conservó.

**Pregunta:** ¿una tool MCP puede ejecutar la propia CLI, en vez de reconstruir su pipeline para MCP?

**Decisión resultante:** [ADR-0030](../adr/0030-tools-mcp-en-subproceso.md).

## Inspiración

| Proyecto | Cómo corre una tool |
|---|---|
| [Ophis](https://github.com/njayp/ophis) (Cobra) | [Subproceso de la propia CLI](https://raw.githubusercontent.com/njayp/ophis/main/docs/execution.md), con selectores de comandos y flags |
| [incur](https://github.com/wevm/incur) (TypeScript y Zod) | `Command.execute` compartido, con `parseMode` `argv` o plano, y `agent: true` |
| [click-to-mcp](https://github.com/coding-dev-tools/click-to-mcp) (Python) | Arma argv y usa `CliRunner` en proceso |
| [FastMCP](https://gofastmcp.com/servers/middleware) (Python) | Framework MCP: `on_call_tool` ve la tool y los argumentos |

La [especificación de MCP](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) autoriza a nivel de transporte, y con stdio indica tomar las credenciales del entorno.

## Método

Plugin experimental en proceso servidor, CLI de muestra con comandos diseñados para fallar, y dos sondas que hablan JSON-RPC real por stdio. Node 26 en macOS. El retorno de `run()` viajaba por fd 3. Después, `senior-dev` y `data-ml` reprodujeron los resultados y agregaron pruebas propias.

## Lo que funcionó

| Prueba | Resultado |
|---|---|
| `structuredContent` desde `run()` | Hasta 5 MB por fd 3, sin EAGAIN ni escritura parcial con lector pausado |
| Valores de quien opera | `region`, `token` y `bucket` fuera del schema; enviarlos no los cambia |
| Protocolo | 0 líneas ajenas en stdout |
| `process.exit(9)` del comando | `isError` con exit 9; el servidor sigue vivo |
| Dos llamadas de 600 ms | 887 ms en total, sin mezclar salidas |
| 20 llamadas simultáneas | 2108 ms, todas correctas |
| Lifecycle | `beforeRun`, middleware, hook `cleanup` y `plugin.cleanup()` en cada llamada |
| Comando que lee stdin | Recibe EOF, no se cuelga |
| Valores `-x`, `--help`, comillas, unicode, vacío | Llegan intactos |
| `tsx`, `bun run`, bundle de esbuild | Funcionan |

## Lo que falló

| Prueba | Resultado |
|---|---|
| Latencia | 245 a 272 ms de mediana contra 0,2 ms en proceso. Node solo arranca en 125 ms |
| Cancelación | El hijo muere por SIGTERM, pero `cleanup` no corre |
| Hijo que ignora SIGTERM | Termina su trabajo aunque se cancele |
| Proceso nieto | Queda huérfano, y `close` espera a nietos con stdio heredado (4,4 s, sin timeout) |
| `bun build --compile` | Falla con node más argv[1]; funciona invocando el binario solo |
| Argv | Un dato igual a un subcomando lo ejecuta; un opcional se corre de lugar; `z.number()` posicional falla; `.transform` corre dos veces; arrays y objetos fallan; entrada de 1,1 MB da `E2BIG` |
| Schema crudo | `.default()` del SDK pisa el archivo de config. Sin env al arrancar, `token` figura requerido |
| Secretos | Un error le devolvió `sk-SECRET-123` al modelo |
| Falso éxito | Un middleware sin `next()`, un `process.exit(0)` y `--mcp=true` respondían "Done." |
| Efectos | Un comando que cobra y lanza respondía `completed: false` |
| Límites | 600 MB en stdout tumban el servidor (`ERR_STRING_TOO_LONG`). El tope solo cubría stdout |
| Variables | `RUNA_TOOL_CALL` heredado rompe una CLI anidada |
| Salida mezclada | Un middleware que imprime se suma al texto; el valor devuelto debe ganar |

## Cancelación que sí funcionó

Probado por `senior-dev` con un hijo aislado, no integrado en `core`: `detached`, `kill(-pid)`, SIGKILL al segundo e IPC `disconnect`. `cleanup` corre, el nieto muere y el hijo rebelde cae en 1 s. Solo en Node: en Bun, IPC no entregó 5 MB.

## Latencia

Importar el SDK en diferido bajó el arranque de 314 a 229 ms. No se midió una CLI real pesada, y es lo que más puede cambiar esta conclusión. Tampoco se midió la duración típica de un turno de modelo.

## Estimaciones

Son de `senior-dev`, y son opinión: subproceso, 6 a 8 días más Windows; en proceso, 5 a 7 días.

## Sin probar

Windows: fds extra, señales y grupos de procesos. Linux en la prueba del fd con lector pausado. CLIs reales pesadas.
