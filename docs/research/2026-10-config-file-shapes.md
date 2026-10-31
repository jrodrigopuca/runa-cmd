# Formas de un archivo de config

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿cómo resuelven otras herramientas el valor de un solo comando, los comandos anidados y las claves desconocidas? Es el insumo de [T-220](../backlog.md#t-220-forma-del-archivo-de-config).

**Respuesta:** lo común es separar lo global de lo que pertenece a un comando, y anidar por secciones. Solo npm y los ejemplos de yargs usan un espacio plano. Ninguna fuente usa un array para nombrar un comando, ni una ruta con espacios. Para las claves desconocidas no hay consenso.

## Valor por comando

| Herramienta | Forma | Fuente |
|---|---|---|
| pip | `[global]` para todos y `[install]` o `[freeze]` por comando; la sección del comando gana | [Configuración](https://pip.pypa.io/en/stable/topics/configuration/) |
| Bun | La raíz configura el runtime, y `[test]`, `[install]` o `[run]` a cada herramienta | [bunfig](https://bun.sh/docs/runtime/bunfig) |
| Click | Diccionario: una clave es un parámetro, y un diccionario es un subcomando, `{"debug": true, "runserver": {"port": 5000}}` | [Commands](https://click.palletsprojects.com/en/stable/commands/) |
| Cargo | Secciones por comando (`[doc]`, `[install]`) o por tema (`[build]`, `[net]`) | [Configuration](https://doc.rust-lang.org/cargo/reference/config.html) |
| Ruff | `[lint]` y `[format]`, con subsecciones | [Configuring Ruff](https://docs.astral.sh/ruff/configuration/) |
| npm | Un solo conjunto de claves; algunas llevan prefijo, como `diff-*` | [Config](https://docs.npmjs.com/cli/v11/using-npm/config) |
| yargs | Propiedades planas que pasan a ser argumentos. No documenta alcance por comando | [API](https://raw.githubusercontent.com/yargs/yargs/main/docs/api.md) |
| Cobra y Viper | Cada flag se enlaza a mano con una clave, y `comando.flag` es un patrón usual, no una regla | [Issue de Viper](https://github.com/spf13/viper/issues/375) |

## Comandos anidados

- **Click:** su documentación dice que el mapa puede anidarse sin límite para cada subcomando.
- **Bun:** usa secciones anidadas, como `[test.reporter]` o `[install.cache]`, aunque son grupos de ajustes y no subcomandos.
- **git:** es lo más parecido a una ruta como texto: `[section "subsection"]`, según su [documentación](https://github.com/git/git/blob/b815a726e9da97924b44d551b10d3fef3b3d1885/Documentation/config.txt).

En Runa, anidar no es ambiguo: `CommandTree` hace que cada nodo sea un comando o un grupo, nunca ambos.

## Claves desconocidas

| Herramienta | Qué hace | Evidencia |
|---|---|---|
| Bun (`lint`, `fmt`) | Error, exit 2 | Documentación; no lo dice de `install`, `run` ni `test` |
| Ruff | Error al leer el archivo, nombrando la clave | [Issue](https://github.com/koxudaxi/ruff-pycharm-plugin/issues/390), no su documentación |
| Cargo | Advertencia, e ignora la clave | [PR](https://github.com/rust-lang/cargo/pull/7575), no su documentación |
| Prettier | Advertencia: `Ignored unknown option` | [Issue](https://github.com/prettier/prettier/issues/13539) |
| pip, npm, Click, yargs | Sus páginas no lo dicen | Sin ejecutar |

## Varios archivos

Ruff usa solo el archivo más cercano, como Runa, y permite heredar con `extend`. pip, Bun, Cargo y npm combinan varios archivos. En todas estas herramientas se lee configuración del proyecto o del directorio, salvo las excepciones de Bun, que para `bun run` solo carga el archivo local.

## Comandos en la raíz o en una sección propia

Esta segunda búsqueda compara dónde vive un comando, y agrega herramientas y frameworks.

| Herramienta | Dónde vive el comando | Fuente |
|---|---|---|
| Click | En la raíz, junto a los parámetros | [Commands](https://click.palletsprojects.com/en/stable/commands/) |
| click-extra | En la tabla de la app, junto a las opciones raíz: `[my-cli.subcommand]` | [Config](https://kdeldycke.github.io/click-extra/config.html) |
| Bun, Cargo, Ruff, Deno | En la raíz, como secciones | Fuentes de arriba, y [Deno](https://docs.deno.com/runtime/fundamentals/configuration/) |
| uv | `[pip]` en la raíz, para la familia `uv pip` | [Configuration files](https://docs.astral.sh/uv/concepts/configuration-files/) |
| AWS CLI | `s3 =` dentro del perfil, para `aws s3` | [S3 config](https://docs.aws.amazon.com/cli/latest/topic/s3-config.html) |
| pip | Secciones con el nombre del comando; lo separado es lo global, en `[global]` | Fuente de arriba |
| oclif | No trae config de valores por comando. Un ingeniero de Shopify contó que armó un comando base propio, y que tuvo que revalidar esos valores | [Issue](https://github.com/oclif/core/issues/613) |

**Ninguna fuente usa una sección tipo `commands`.** No es prueba de que no exista: es lo que apareció en esta muestra.

**El choque de nombres es real.** click-extra advierte que combinar claves puede causar colisiones "if a config key happens to share a name with a subcommand". Y si `subcommand` es un string y también existe `subcommand.int_param`, registra una advertencia y gana el último valor. La [regla de Click](https://click.palletsprojects.com/en/stable/commands/) no trata el caso. pip lo evita de otro modo: lo que encierra en una sección es lo global.

**Sin confirmar:** no se pudo leer cómo lo resuelven cyclopts, jsonargparse ni Kong para comandos. Kong acepta objetos y claves con punto en grupos con prefijo, según su `resolver_test.go`, pero eso no muestra el caso de un comando.

## Límites

No se ejecutó ninguna de estas herramientas. Las filas basadas en issues o PRs describen un caso reportado, y pueden haber cambiado. Es una muestra de herramientas conocidas, elegida a criterio y no por sorteo.
