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

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-015 | En `defineCLI` con un comando, `tool tool` consume el dato como nombre. Con `runCLI` no pasa | Observado | `resolveCommandFromTree` | [T-208](./backlog.md#t-208-retirar-el-modo-implícito) |
| KI-040 | La ayuda de un subcomando muestra `USAGE  envOption [options]`, sin el nombre de la CLI | Observado | Las dos ayudas usan `fullPath` sin la CLI | [T-214](./backlog.md#t-214-la-ayuda-de-un-subcomando-muestra-la-cli) |
| KI-041 | El campo `readme` del registro de npm está vacío, así que `npm view` no lo muestra. La página de npm sí muestra el README | Observado | Sin confirmar | [T-215](./backlog.md#t-215-readme-y-changelog-en-npm) |
| KI-047 | `eval "$(cli completions zsh)"` falla | Observado | El script solo funciona como archivo en `fpath` | [T-225](./backlog.md#t-225-completions-con-eval-y-texto-con-símbolos) |
| KI-049 | La ayuda del plugin emite códigos ANSI hacia un pipe y con `NO_COLOR=1` | Observado | Sin confirmar | [T-224](./backlog.md#t-224-salida-de-ayuda-sin-estilos-fuera-de-una-terminal) |

## Severidad baja

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-036 | Con `completionsPlugin`, `completions` aparece como tool MCP, aunque a un agente no le sirve | Observado | Los comandos de un plugin se exponen como los del autor | [T-308](./backlog.md#t-308-comandos-de-plugins-fuera-de-las-tools) |
