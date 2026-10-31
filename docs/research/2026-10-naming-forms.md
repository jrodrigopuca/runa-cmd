# Una forma de escribir un nombre, o varias

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿conviene que un nombre se escriba de una sola forma en todos lados, o aceptar varias? Reabre [ADR-0024](../adr/0024-kebab-case.md) desde [T-213](../backlog.md#t-213-nombre-de-los-comandos).

**Respuesta:** nadie en la muestra convierte nombres de comandos y flags de forma idéntica, pero hay un patrón: en la terminal se ve kebab-case, y aceptar otra forma siempre es opcional o una tolerancia, no el estándar. Las flags y los comandos tienen necesidades distintas: una opción se lee como propiedad en el código, y un comando no.

## Evidencia

| Fuente | Qué hace | Dato |
|---|---|---|
| [Uso público](./2026-10-cli-usage.md) | Flags de varias palabras en commander | 618 de 672 en kebab-case (92%) |
| [clig.dev](https://clig.dev/) | Comandos: "Use only lowercase letters, and dashes if you really need to" | No da regla explícita para flags |
| [commander](https://raw.githubusercontent.com/tj/commander.js/master/Readme.md) | `--template-engine` se lee como `templateEngine` | No dice si acepta `--templateEngine` |
| [yargs-parser](https://raw.githubusercontent.com/yargs/yargs-parser/main/README.md) | `--foo-bar` da las dos claves; es el default | No dice qué hace `--fooBar` |
| [Stricli](https://bloomberg.github.io/stricli/docs/features/argument-parsing/flags) | Coincidencia exacta por defecto, y `allow-kebab-for-camel` como opción | Separa cómo se escribe de cómo se documenta |
| [pflag](https://edge.googlesource.com/third_party/spf13/pflag/+/8f325b43258ccf26af22e17da516f3eb8c0d1a4d%5E%21/) | Una función de normalización opcional iguala `-`, `_` y `.` | La usa quien la registra |
| [AWS](./2026-10-aws-cli-lessons.md) y [gh](https://cli.github.com/manual/gh_help_formatting) | Sus flags de ejemplo son minúsculas y con guiones: `--page-size` | Ejemplos, no una regla |

## Aceptar varias formas

**A favor:** quien copia una clave de un schema o de un config puede escribirla tal cual, y un script viejo sigue funcionando.

**En contra:** dos sintaxis son parte del contrato para siempre, y hay que definir qué se muestra en ayuda, errores y completions. Hoy `--darkColor` ya falla con exit 2 y sugiere `--dark-color`, así que un agente puede corregirse.

**Dirección del cambio:** agregar una tolerancia es compatible y puede salir en una minor. Quitarla exige una major. Por eso conviene empezar estricto.

## Restricciones de Runa

- `@qr-plus/cli` publicó `--dark-color` con commander, así que debe mantenerlo.
- `run()` lee `options.darkColor`. Una clave `'dark-color'` obliga a `options['dark-color']`.
- Un comando no se lee como propiedad en `run()`, así que su clave puede ser `'with-output'` sin costo en el código.

## Límites

El estándar GNU no se pudo leer (respondió 429). No se pudo confirmar cómo tratan esto citty, clipanion ni oclif. No se ejecutó ninguna herramienta.
