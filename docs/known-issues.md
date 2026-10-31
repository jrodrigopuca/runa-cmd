# Problemas conocidos

> **Verificado:** 2026-10-31, sobre `0.2.0-beta.2` compilada desde `main`.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-006 | En `defineCLI` con un comando, `completionsPlugin` rompe el modo implícito: `tool hola` da 127. Con `runCLI` no pasa | Observado | El modo depende de contar comandos | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |
| KI-037 | Lo que `run()` devuelve no sale por stdout: la terminal queda vacía con exit 0, aunque [`VERSIONING.md`](../VERSIONING.md) promete que los resultados van a stdout | Observado | Solo el canal de tools recibe el resultado | [T-212](./backlog.md#t-212-lo-que-devuelve-un-comando-llega-a-la-terminal) |
| KI-038 | Sin `output`, devolver un valor da `TS2322`, aunque el README de `mcp` lo documenta | Observado | `RunReturn` exige `void` sin `output` | [T-212](./backlog.md#t-212-lo-que-devuelve-un-comando-llega-a-la-terminal) |
| KI-043 | Las opciones globales ignoran el archivo de config sin aviso, aun con un tipo inválido | Observado | Solo las opciones de comando leen `configValues` | [T-219](./backlog.md#t-219-las-opciones-globales-leen-el-config) |
| KI-044 | Una clave del config se aplica a toda opción con ese nombre en cualquier comando: `{"force":true}` activa `--force` | Observado | El config es un solo espacio plano | [T-220](./backlog.md#t-220-forma-del-archivo-de-config) |

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-015 | En `defineCLI` con un comando, `tool tool` consume el dato como nombre. Con `runCLI` no pasa | Observado | `resolveCommandFromTree` | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |
| KI-039 | En `defineCLI`, `meta.name` no nombra al comando: `with-output` da 127 si la clave es `withOutput` | Observado | Las rutas salen de la clave | [T-213](./backlog.md#t-213-nombre-de-los-comandos) |
| KI-040 | La ayuda de un subcomando muestra `USAGE  envOption [options]`, sin el nombre de la CLI | Observado | Las dos ayudas usan `fullPath` sin la CLI | [T-214](./backlog.md#t-214-la-ayuda-de-un-subcomando-muestra-la-cli) |
| KI-041 | El campo `readme` del registro de npm está vacío en los paquetes publicados | Observado | Sin confirmar | [T-215](./backlog.md#t-215-readme-y-changelog-en-npm) |
| KI-042 | Por MCP, un `CommandError` previsto devuelve `safeToRetry: false` y "may have taken effect", aun con `readOnlyHint: true` | Observado | No hay forma de declarar un fallo sin efecto | [T-309](./backlog.md#t-309-fallos-sin-efecto-por-mcp) |
| KI-045 | `z.number()` en un posicional falla por CLI y funciona por MCP | Observado | Los posicionales no pasan por la coerción de las opciones | [T-222](./backlog.md#t-222-los-posicionales-convierten-como-las-opciones) |
| KI-046 | Ante un error, `cli.run()` termina el proceso, y nunca devuelve un resultado | Observado | El ciclo de vida llama a `process.exit` | [T-221](./backlog.md#t-221-probar-una-cli-sin-subproceso) |
| KI-047 | `eval "$(cli completions zsh)"` falla | Observado | El script solo funciona como archivo en `fpath` | [T-225](./backlog.md#t-225-completions-con-eval-y-texto-con-símbolos) |
| KI-048 | Una flag desconocida en la raíz da `Command not found` y 127, no un error de uso | Observado | Sin confirmar | [T-223](./backlog.md#t-223-flag-desconocida-en-la-raíz) |
| KI-049 | La ayuda del plugin emite códigos ANSI hacia un pipe y con `NO_COLOR=1` | Observado | Sin confirmar | [T-224](./backlog.md#t-224-salida-de-ayuda-sin-estilos-fuera-de-una-terminal) |

## Severidad baja

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-036 | Con `completionsPlugin`, `completions` aparece como tool MCP, aunque a un agente no le sirve | Observado | Los comandos de un plugin se exponen como los del autor | [T-308](./backlog.md#t-308-comandos-de-plugins-fuera-de-las-tools) |
