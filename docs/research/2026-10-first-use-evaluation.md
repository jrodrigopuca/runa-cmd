# Evaluación de primer uso con `0.2.0-beta.2`

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿`0.2.0-beta.2` puede pasar a estable, según alguien que lo usa por primera vez?

**Respuesta:** todavía no. Quien evaluó recomienda una beta más, y el contraste lo confirma: el archivo de configuración da resultados incorrectos sin avisar, y su formato es caro de cambiar después de la 1.0.

## Método

Un agente independiente evaluó dos proyectos sin leer este repo: [`local-beacon`](./2026-10-local-beacon-friction.md) (referencias `F-nn`) y `notes`, una CLI nueva hecha por otro agente que no conocía esos resultados (referencias `H-nn`). Usó Node 26.11, npm 12.2, TypeScript 7.0 y Zod 4.6 en macOS.

Del lado de Runa se reprodujo cada caso bloqueante con una CLI real sobre `main`, en `0.2.0-beta.2`. Lo que figura como *sin contrastar* se conoce solo por el reporte.

## Resultado

| ID | Hallazgo | Contraste | Tarea |
|---|---|---|---|
| H1 | Las globales ignoran el config, aun con un tipo inválido | Observado: `{"store":"fromcfg"}` y `{"store":5}` dan `dflt` con exit 0. Leído: `defineCLI` tampoco deja declarar `env` en una global | [T-219](../backlog.md#t-219-las-opciones-globales-leen-el-config) |
| H2 | El config es un espacio plano entre comandos | Observado: `{"force":true}` activa `--force`, una clave rompe a otro comando con exit 2, y `{"clear":{...}}` se ignora sin aviso | [T-220](../backlog.md#t-220-forma-del-archivo-de-config) |
| H3 | `z.number()` en un posicional falla por CLI y funciona por MCP | Observado: `num 5` da exit 2 | [T-222](../backlog.md#t-222-los-posicionales-convierten-como-las-opciones) |
| H4 | `cli.run()` termina el proceso ante un error, y devuelve `undefined` | Observado: el código posterior a un `run()` fallido no corre | [T-221](../backlog.md#t-221-probar-una-cli-sin-subproceso) |
| H5 | El ejemplo de Layer 3 de `help` no compila | Sin contrastar | [T-227](../backlog.md#t-227-detalles-de-ayuda-y-errores) |
| H6 | `ctx.command.name` es solo la hoja, y el middleware no recibe el comando | Observado: `tag add` da `add`. Leído: `MiddlewareContext` no tiene el comando | [T-226](../backlog.md#t-226-ruta-completa-en-hooks-y-middleware) |
| H7 | `eval "$(cli completions zsh)"` falla | Observado: `can only be called from completion function` | [T-225](../backlog.md#t-225-completions-con-eval-y-texto-con-símbolos) |
| H8 | Un `]` en una descripción rompe el completado en zsh | Sin contrastar | T-225 |
| H9 | Un config en el directorio cambia el schema de la tool | Leído: `fixedValue` lee el config; la consecuencia no se ejecutó | T-220 |
| H10 | La ayuda del plugin emite estilos hacia un pipe y con `NO_COLOR=1` | Observado: ANSI en stdout | [T-224](../backlog.md#t-224-salida-de-ayuda-sin-estilos-fuera-de-una-terminal) |
| H11 | Igual a F-12 | Observado en [`local-beacon`](./2026-10-local-beacon-friction.md) | [T-212](../backlog.md#t-212-lo-que-devuelve-un-comando-llega-a-la-terminal) |

## Menores contrastados

- `verify --bogus` da `Command not found` y 127, en vez de un error de uso: [T-223](../backlog.md#t-223-flag-desconocida-en-la-raíz). Observado.
- Un JSON roto en el config sale como `Unexpected error`. Observado: entra en T-220.
- Conviven `Invalid value for --x` y `limit: Too small: expected number to be >0`, que expone a Zod. Observado.
- `nada` sugiere `add`, y `-t=a` guarda `=a`. Observado.
- Un array vacío muestra `(default: )`. Observado.
- `rawArgs` en hooks llega sin las flags globales, aunque el README dice "Original argv". Observado.
- El generador de zsh ofrece `--no-help` y `--no-version`. Observado.

Estos también entran en T-227, sin contrastar: booleano con default `true` sin `--no-x` en la ayuda, descripción de grupos, `FLAGS OPTIONS`, `...` en el uso de un variádico, posicionales enum en completions, y `exclude` por grupo.

## Qué cambia

- **La prioridad pasa al config:** H1 viola [ADR-0008](../adr/0008-config-merge-en-core.md), y H2 define un formato que después de la 1.0 solo cambia con una major.
- **H2 también es una cuestión de seguridad a evaluar:** un archivo en el directorio puede apagar un guardarraíl como `--force`. Depende de los `searchPaths`, y no se midió.
- **`notes` no cuenta para [T-404](../backlog.md#t-404-usar-mcp-desde-un-agente-real) ni cierra [T-403](../backlog.md#t-403-migración-de-un-dev-externo):** no prueba un agente real por MCP, y no lo hizo un dev externo.

## Lo que funcionó

El reporte confirma la inferencia de tipos, el parser, la prioridad en opciones de comando, los exit codes, el ciclo de vida, las señales, MCP (`exclude`, `structuredContent`, `effect`, aislamiento, recorte) y el empaquetado con `npm pack`. Quedó sin probar: bash y fish interactivos, Linux, Windows, Claude Desktop, `serverOnly`, `output_too_large`, llamadas concurrentes y loaders propios.
