# Fricción de `local-beacon` con `0.2.0-beta.2`

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿qué encuentra quien adopta Runa y MCP viendo solo lo publicado?

**Respuesta:** lo probado en MCP funciona, pero la idea central todavía tiene un hueco: lo que devuelve un comando le llega al agente y no a la persona. Hay cinco hallazgos que conviene resolver antes de abrir la ventana de estabilidad, y dos de ellos pueden requerir cambios incompatibles.

## Método

`local-beacon` es un proxy local para Ollama con CLI y tools MCP. Lo construyó un agente con acceso a lo publicado (README, tipos y comportamiento), sin leer este repo, sobre Node 26 y npm 12. Su reporte tiene 14 hallazgos.

Del lado de Runa, cada uno se contrastó con `main`, en `0.2.0-beta.2`: se ejecutó una CLI equivalente como proceso real, se llamaron sus tools con el cliente del SDK de MCP, y se compiló con `tsc` el caso de tipos. Lo que no se ejecutó figura como *leído*.

## Resultado

| ID | Nivel | Hallazgo | Contraste | Tarea |
|---|---|---|---|---|
| F-01 | Alto | Lo que `run()` devuelve no se ve en la terminal | Observado: stdout vacío y exit 0 con objeto, con y sin `output`, y con string. Por MCP sí llega | [T-212](../backlog.md#t-212-lo-que-devuelve-un-comando-llega-a-la-terminal) |
| F-12 | Alto | Sin `output`, los tipos prohíben devolver lo que el README de `mcp` documenta | Observado: `TS2322` con objeto y con string; en ejecución funciona | T-212 |
| F-02 | Medio | No hay una forma estándar de `--json`, y una opción propia llega a la tool | Leído: sin `env`, una opción queda en el schema, y `serverOnly` exige un valor | T-212 |
| F-03 | Medio | `meta.name` no define el nombre del comando | Observado: `with-schema` da 127; la clave `'with-output'` funciona | [T-213](../backlog.md#t-213-nombre-de-los-comandos) |
| F-04 | Medio | La ayuda de un subcomando omite el nombre de la CLI | Observado: `USAGE  envOption [options]`, también sin el plugin de ayuda | [T-214](../backlog.md#t-214-la-ayuda-de-un-subcomando-muestra-la-cli) |
| F-05 | Medio | El README no llega al registro de npm | Observado: `readme` vacío en `core` y `mcp`; `vite`, `zod` y `commander` lo traen. La página respondió 403 a `curl`, así que no se vio | [T-215](../backlog.md#t-215-readme-y-changelog-en-npm) |
| F-06 | Medio | Un fallo previsto parece un posible efecto | Observado: `effect: "unknown"` y `safeToRetry: false`, también con `readOnlyHint: true` | [T-309](../backlog.md#t-309-fallos-sin-efecto-por-mcp) |
| F-07 | Bajo | Un servicio que termina bien imprime `Interrupted.` | Observado: stdout correcto, stderr `Interrupted.`, exit 130 | [T-218](../backlog.md#t-218-parada-limpia-de-un-servicio) |
| F-08 | Bajo | El error de opción faltante no nombra su variable de entorno | Observado | [T-216](../backlog.md#t-216-opción-faltante-con-su-variable-de-entorno) |
| F-09 | Bajo | No hay guía para probar comandos | Leído: ya está en [T-503](../backlog.md#t-503-documentación-de-v1) | T-503 |
| F-10 | Bajo | Los paquetes no incluyen `CHANGELOG` | Observado: no viaja en el paquete, porque `files` no lo incluye | T-215 |
| F-11 | Bajo | `RunContext` no dice si corre por MCP | Leído: `invocation` solo está en `HookContext` | T-212 |
| F-13 | Bajo | Un valor por defecto calculado se muestra tal cual en la ayuda | Observado: se ve la ruta completa del home | [T-217](../backlog.md#t-217-valor-por-defecto-legible-en-la-ayuda) |
| F-14 | Bajo | La redacción quita datos que no son secretos | Observado: `no proxy on [redacted]` con una ruta en `env` | [T-310](../backlog.md#t-310-valores-fijos-que-no-son-secretos) |

## Qué cambia

- **F-01 contradice [`VERSIONING.md`](../../VERSIONING.md):** promete "Results go to stdout", pero un resultado devuelto no sale por ahí. Y F-12 hace que el camino documentado no compile.
- **F-03 va contra [ADR-0029](../adr/0029-cada-campo-tiene-efecto.md):** `meta.name` es obligatorio y dentro de `defineCLI` casi no tiene efecto.
- **El bloqueo de [T-208](../backlog.md#t-208-retirar-el-modo-implícito) fue correcto:** abrir la ventana antes de este reporte la habría reiniciado.
- **T-404 sigue abierta:** el reporte muestra el CLI y MCP funcionando, pero no dice si un modelo llamó las tools por su cuenta, ni cómo reaccionó ante un error.

## Lo que funcionó

El reporte confirma `--help`, `--version`, los exit codes 2 y 127, `CommandError`, `ctx.signal` y `cleanup`, el plazo de 2 s, `exclude`, `annotations`, las opciones con `env` fuera del schema y `structuredContent`. Cada llamada MCP costó unos 200 ms en una M1, con TypeScript sin compilar.
