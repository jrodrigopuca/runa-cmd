# Segunda revisión antes de v1: coherencia y experiencia de desarrollo

> **Fecha:** 2026-11-08. Documento histórico: no se actualiza.

**Pregunta:** después de la Fase 7 (T-233 a T-246), ¿lo que Runa dice coincide con lo que hace, y la propuesta es sólida frente a las alternativas, antes de publicar la `0.2.0-beta.7`?

**Respuesta:** sí, con siete arreglos que tocan el contrato y conviene que entren en la beta.7. Los criterios de T-233 a T-246 se cumplen, probados con procesos reales y con un cliente MCP. El agente de experiencia de desarrollo concluye que la propuesta es sólida para una 1.0: en 19 casos de error de uso, Runa es una de tres herramientas que nunca sale con 0 después de un error, y `testCLI()`, el config y `--mcp` funcionan en un caso real. Lo grave es otra cosa: dos casos donde un valor desaparece sin aviso, uno en los alias y otro en MCP.

## Método

Dos agentes independientes, sin escribir en el repo, el 2026-11-08 con Node 26.11.1 en macOS:

- **Coherencia y aseguramiento (agente `qa`):** probó con tarballs de `pnpm pack` de `main`, instalados con npm, que READMEs, guías, JSDoc, `VERSIONING.md` y `docs/` coincidan con el código, y cada criterio de T-233 a T-246. Usó un cliente MCP real (SDK 1.32.2), bash 3.2 y zsh 5.9.
- **Experiencia de desarrollo (agente `generalist`):** construyó una CLI real con Runa de `main`, commander 15.1.0 con y sin `@commander-js/extra-typings`, yargs 18.2.0, citty 0.2.2, cac 7.1.0, oclif 6.0.15 y `@stricli/core` 1.3.0. Midió líneas, 25 casos de error, tipos con 5 errores a propósito, peso, arranque con hyperfine (30 corridas) y `--mcp` con el SDK. Siguió la guía de migración desde commander tal como está escrita.

Se volvieron a reproducir en la sesión principal los hallazgos que deciden prioridad: los marcados como **verificado**.

## Lo que toca el contrato

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | Por MCP, un valor que el modelo manda para una opción que fijó el operador, por config o env, se descarta en silencio y la llamada responde éxito con el valor del operador | Verificado: el modelo manda `replicas: 5` y recibe éxito con `replicas 2` |
| 2 | Un alias igual a la flag de su propia opción (`alias: ['--env']` en `env`) descarta el valor escrito, y la opción toma su default | Verificado: `--env prod` da `{"env":"DEFAULT"}`, exit 0 |
| 3 | Dentro de un comando, `OPTION_COLLISION` no detecta dos alias iguales, un alias igual a la flag de otra opción, ni un alias `--no-x` que le quita la negación a `x`; solo compara contra las globales, aunque el README dice que cubre "two keys of a command" | Verificado: dos opciones con `-e`, gana la primera; un alias `--extra` en `env` le roba la flag a `extra` |
| 4 | Con una opción global obligatoria, un comando que no existe, o nada que correr, da `Missing required option` con exit 2 en lugar de 127 | Verificado: `tool nope` → `Missing required option: --token`, exit 2 |
| 5 | Un `CommandError` de otra copia de `core` es reconocido por `isRunaError`, pero la CLI lo trata como un error inesperado: pierde su exit code y sale como `Unexpected error` | Verificado: exit 1 en lugar de 3 |
| 6 | Por MCP, un valor inválido en el config o en env del operador da `class: invalid_input`, como si fuera culpa del modelo, y no se avisa al arrancar | Verificado con el config |
| 7 | Un `z.boolean()` sin `.default()` ni `.optional()` es obligatorio: `Missing required option: --shout`. Ninguna otra herramienta trata así una flag | Verificado |

## Lo que no toca el contrato

| # | Hallazgo | Evidencia |
|---|---|---|
| 8 | Un valor inválido que vino de una variable de entorno se informa como la flag, sin nombrar la variable, contra el README ("the message says where"). commander dice `from env 'DEPLOY_ENV'` | Reproducido por los dos agentes |
| 9 | La ayuda no muestra rangos ni que un número es entero, y el JSON Schema de MCP sí: el modelo ve más reglas que la persona | Reproducido por el agente |
| 10 | Con `not_configured` y además un posicional que falta, el texto lista solo el posicional | Reproducido por el agente |
| 11 | Los errores que tira `defineCommand` al importar (`INVALID_META_OPTIONS`, `--json`) salen como excepción con stack; `args: z.object(...)` da un error sin `code` que dice que no es Zod v4 | Reproducido por el agente |
| 12 | Un objeto pasado directo a `plugins`, sin `definePlugin`, da `PLUGIN_CIRCULAR_DEPENDENCY` o un error sin `code`, no `INVALID_PLUGIN` | Reproducido por el agente |
| 13 | En el config, una lista no acepta un texto (`"tags": "a"`), aunque en la terminal `--tags a` sirve; la fila de `INVALID_CONFIG` no menciona `configurable: false` | Reproducido por el agente |
| 14 | El generador: un nombre inválido sale sin el hint de `--help`, y el hint no lleva `@beta` | Reproducido por el agente |
| 15 | El valor repetido en un error escapa `"` pero no `'`, aunque lo rodea con `'` | Reproducido por el agente |
| 16 | `z.literal()` se muestra como `<string>` y no se completa; `help <TAB>` no ofrece nada en zsh | Reproducido por el agente |
| 17 | La tabla de propiedades de `defineCommand` del README dice "Command version" para `meta.version`, sin aclarar que solo vale con `runCLI`; el ejemplo del changeset `operator-values-are-not-the-models-fault.md` quedó viejo después de T-246 | Leído por el agente |
| 18 | Errores de TypeScript ilegibles fuera del camino: una opción con la forma de citty, o un `meta` que falta | Reproducido por el agente |

## Comparación

| Aspecto | Gana | Medido |
|---|---|---|
| Crear el proyecto | Runa | 0,21 s desde el tarball; publicado, 1,4 s más 1,0 s de `npm install` |
| Líneas, CLI real | Runa y oclif | 23 cada una (oclif más su andamiaje); commander con extra-typings 33, cac y yargs 41, citty 47, stricli 49 |
| Tipos, 5 errores a propósito | Runa, commander con extra-typings y stricli | 5/5; yargs y citty 4/5; oclif 3/5; cac 0/5 |
| Salida 0 después de un error, 19 casos | Runa, commander, stricli y oclif | 0 casos; yargs 1, citty 3, cac 3 |
| Peso, solo runtime | citty y cac | 56 KB; stricli 340 KB; commander 236 KB; Runa 9.024 KB, con `mcp` 27.992 KB y 97 paquetes |
| Arranque compilado, sobre Node vacío | cac y citty | cac +6 ms, citty +7, stricli +12, commander +19, Runa +38, yargs +49, oclif +60 |
| `--mcp` | Runa, sola | ~330 ms para conectar y ~148 ms por llamada, un proceso por llamada |
| Migración desde commander | Funciona | La guía, seguida tal cual, compila y pasan sus 5 tests |

Lo que las guías dicen mal o de más: que yargs no valida el config (aplica `choices` y `check` a `.config()` y `.env()`); que yargs, citty y oclif detectaron todos los errores de tipos (no detectan una opción que no existe); que no hay una fila de variables de entorno; que no se nombra a `@stricli/core`, el competidor más cercano "tipado y testeable" sin Zod; que no figura la latencia de MCP ni que un config en la carpeta actual cambia el schema de una tool; que `npm i @runa-cmd/mcp` sin `@beta`, en un proyecto con `core@beta`, falla con ERESOLVE (verificado; en un proyecto vacío no falla); y que la guía de migración no nombra extra-typings y cita commander 15.0.0.

## Límites

Una máquina, un día, Node 26.11.1. fish y Windows sin probar. La CLI real la escribió un agente que ya conocía Runa: los conceptos nuevos y los errores confusos salen de pruebas a propósito, no de una persona nueva. El arranque de oclif se midió sin manifest. Las tareas que salen de acá vuelven a reproducir su hallazgo antes de cambiar código.
