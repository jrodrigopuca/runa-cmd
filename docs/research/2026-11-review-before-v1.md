# Revisión antes de v1: coherencia y comparación

> **Fecha:** 2026-11-08. Documento histórico: no se actualiza.

**Pregunta:** ¿lo que Runa dice coincide con lo que hace, y la experiencia es mejor que la de las alternativas, antes de la 1.0?

**Respuesta:** lo central funciona como dicen las docs, y para quien corre la CLI, un script o un agente, Runa es mejor de verdad: es la única de seis herramientas sin fallas silenciosas, tiene los mejores errores de config, y es la única con MCP. Pero hay 12 puntos donde lo dicho y lo hecho no coinciden, varios tocan el contrato, y las guías nos favorecen de más en tres. Todo se arregla con cambios aditivos o con decisiones que conviene tomar antes de la 1.0, porque después costarían una major.

## Método

Dos agentes independientes, sin acceso de escritura al repo, el 2026-11-08 con Node 26.11.1 en macOS:

- **Coherencia (agente `qa`):** comparó READMEs, guías, JSDoc, ADRs y `VERSIONING.md` con el código de `main`, reproduciendo cada hallazgo con un script.
- **Comparación (agente `generalist`):** volvió a construir la misma CLI con Runa 0.2.0-beta.6 y `main`, commander 15.1.0, `@commander-js/extra-typings` 15.1.0, yargs 18.2.0, citty 0.2.2, cac 7.1.0 y oclif 6.0.15, y midió 19 casos de error por herramienta, arranque con hyperfine (30 corridas), tipos con `tsc --strict` y peso con `du`. Se le pidió buscar dónde Runa es peor.

Se volvieron a comprobar en la sesión principal los hallazgos que deciden prioridad: los marcados como **verificado**.

## Coherencia

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | Si falta una opción `z.enum` obligatoria con `env`, el error es `Invalid value for --env. Expected one of: …`, no `Missing required option: --env, or set DEPLOY_ENV`, como promete el README de `core` sobre su ejemplo principal. Igual con `z.literal` y con argumentos enum | Verificado |
| 2 | `VERSIONING.md` hace contrato los `code` de `RunaError` y las `class` de `_meta['runa/error']`, pero no hay una lista: 22 códigos en el código y 2 en la doc; 10 clases y 1 en la doc. `guides/mcp.md` remite al README de `mcp` por "its error classes", que no están | Reproducido por el agente |
| 3 | Un archivo de config inválido da tres formatos: un valor inválido es `ValidationError`, con el texto de Zod y el hint de `--help`; una clave desconocida es `ConfigError`, sin hint; un JSON roto, un tercero. `"force": 1` se rechaza y `"force": "1"` no, contra ADR-0028 | Reproducido por el agente |
| 4 | Por MCP, una opción del operador sin valor da `class: invalid_input`, como si el modelo se hubiera equivocado, y los errores de input nombran `--flag` y `<arg>` en vez de las claves del schema. Un `Error` común tirado desde `run()` sale como `command_failed`, igual que un `CommandError`, contra el README de `mcp` | Reproducido por el agente |
| 5 | El peer de `@runa-cmd/help` es `^0.2.0-beta.1`, pero usa `defaultDescription` (beta.5) e `inherited` (beta.7): con un `core` viejo instala sin aviso y esas funciones no hacen nada. Se cumple el "Revisar si" de ADR-0039 | Verificado |
| 6 | `helpPlugin({ exitOnHelp: true })` sale con 0 sin nada que correr, contra ADR-0034, y no está en el README; el README de `help` dice que el plugin agrega `--help` y termina con 0, y la flag es de `core` | Verificado el exit 0 |
| 7 | Slots del tema sin efecto: `error` y `success` no cambian nada; `secondary` solo colorea `(required)`; el README y el JSDoc los describen distinto | Reproducido por el agente |
| 8 | Un alias sin guion, como `['e']`, aparece en la ayuda y no funciona (`Unknown option: -e`), y nada lo valida al arrancar | Verificado |
| 9 | Docs internas desactualizadas: ADRs implementados marcados "pendiente de código"; `architecture.md` todavía nombra el modo implícito; `components/core.md` se contradice sobre `onError` en una parada | Leído por el agente |
| 10 | Formatos distintos para lo mismo: `Expected one of` con punto o con dos puntos, `invalid value` en minúscula en el config; `GLOBAL OPTIONS` antes de `COMMANDS` en la ayuda de un grupo y después en la raíz; la lista de secciones del README de `help` sin `GLOBAL OPTIONS`; la ayuda de una CLI con `runCLI` sin la versión en el encabezado | Reproducido por el agente |
| 11 | El generador tiene `-v, --version`, que ADR-0021 descarta; sus errores de uso salen sin hint y con el texto de `parseArgs`; `VERSIONING.md` hace contrato su CLI y su README no la lista | Reproducido por el agente |
| 12 | Menores: el README de `completions` dice que el plugin hace obligatorio el nombre del comando; la ruta de config de Claude Desktop en el README de `mcp`; la arquitectura de `mcp` lista 4 archivos y hay 6; la tabla de Plugin API sin `replaceHelp`; `meta.version` de un subcomando no hace nada, sin aviso; los READMEs usan `cli.run();` sin `await` | Leído o reproducido por el agente |

Coherente, según el agente: la guía de inicio seguida desde cero con npm en Node 24.13 y 26.11; los errores de uso con exit 2 y el hint correcto; las colisiones al arrancar; `testCLI()`; `RUNA_DEBUG=1` sin valores; las paradas de ADR-0046; el operador sobre el modelo en MCP; `--[no-]x`.

## Comparación

| Aspecto | Gana | Medido |
|---|---|---|
| Crear el proyecto | Runa | 1,3 s y un test que pasa; oclif, 80 s, 183 MB y un template viejo |
| Líneas, CLI simple | cac y commander | cac 12, commander 13, Runa 17, citty 17, yargs 21 |
| Peso, solo runtime | citty y cac | 56 KB; commander 236 KB; Runa 8,98 MB, Zod 8,25; **Runa con `mcp`, 27,9 MB y 92 paquetes** |
| Arranque compilado, sobre Node vacío (104 ms) | citty y cac | cac +3 ms, commander +9, **Runa +36**, yargs +47, oclif +53. Casi todo lo de Runa es importar Zod |
| Tipos inferidos | Empate | Runa, yargs, citty, oclif y **commander con extra-typings** detectan las 4 asignaciones mal tipadas |
| Validación más allá del tipo | Runa | El mismo schema valida terminal, config y MCP |
| Errores y exit codes | Runa, y oclif cerca | Runa: 2 en todo error de uso y 127 para un comando que no existe; oclif también usa 2. yargs, citty y cac salen con 0 en varios errores |
| Tests sin subproceso | Runa | `testCLI()`; oclif tiene `@oclif/test` |
| Archivos de config | Runa | Nombra archivo y clave, y sugiere ante un typo |
| Completions | yargs | Dinámicas, y completan valores después de un posicional; **las de Runa en bash fallan ahí** (verificado) |
| Comandos como tools | Runa, sola | 345 ms para conectar y ~146 ms por llamada, un proceso por llamada |

Donde Runa es peor, de lo que más le duele a alguien nuevo a lo que menos:

1. **Completions de bash** después de un posicional o del valor de una opción: no completan nada (verificado).
2. **Sin `meta.description`**, TypeScript suma un error engañoso sobre lo que devuelve `run`.
3. **`@beta`:** `npm i @runa-cmd/mcp` en un proyecto nuevo falla con ERESOLVE, porque su `latest` es 0.1.0. Se resuelve al publicar la 1.0.
4. **`tool help`** da 127 y sugiere otro comando (verificado); commander, yargs, cac y oclif lo aceptan.
5. Los errores no repiten el valor recibido (`expected int`), y el config usa otro formato que la terminal.
6. Una clave de comando en la raíz del config no sugiere dónde va.
7. El costo de MCP no aparece en las guías.
8. El arranque compilado es cuatro veces el de commander.
9. Cada opción se define en dos lugares: el schema, y `meta.options` para alias y env.

Lo que las guías dicen mal o de más: que commander no infiere tipos, sin nombrar extra-typings; el arranque medido sin compilar; el peso sin MCP; las líneas de Runa (17, no 16); commander 15.0.0 (hoy 15.1.0); que solo Runa usa exit 2 (oclif también); que la ayuda muestra las reglas (no muestra rangos); que no comparan completions; y los datos de oclif (con `--yes` no pregunta, tarda 80 s, trae `@oclif/test`).

## Límites

Una máquina, una CLI chica y un día. zsh y fish no se probaron con TAB. Los hallazgos no verificados en la sesión principal son del agente; las tareas que salen de acá los vuelven a reproducir antes de cambiar código.
