# Facilidad de uso de Runa frente a otras herramientas

> **Fecha:** 2026-11-03. Documento histórico: no se actualiza.

**Pregunta:** ¿cuánto le cuesta a un dev hacer su primera CLI con Runa, comparado con otras herramientas, y dónde conviene reducir la dificultad?

**Respuesta:** escribir la CLI cuesta lo mismo que con las demás. La diferencia de Runa no está en el código, sino alrededor: dos paquetes en vez de uno, `@beta`, un import propio para Zod, y separar la CLI de su arranque para probarla. Lo que más ayudaría es un generador de proyectos, que solo tiene oclif. En comportamiento, Runa es la que mejor responde a los errores de quien usa la CLI.

## Método

Se construyó la misma CLI con cada herramienta, en carpetas vacías, con la última versión de npm del 2026-11-03: `greet hello <name> --shout`, con descripción y versión. Se ejecutó con Node 26.11.1 en macOS, sin compilar.

| Herramienta | Versión |
|---|---|
| Runa | `@runa-cmd/core@0.2.0-beta.4` y `zod@4.6.7` |
| commander | 15.0.0 |
| yargs | 18.2.0, con `@types/yargs` |
| citty | 0.2.2 |
| cac | 7.1.0 |

oclif (6.0.15) no se construyó: usa clases y un generador, y no es comparable línea por línea.

## Escribir la CLI

| | Runa | commander | yargs | citty | cac |
|---|---|---|---|---|---|
| Líneas, sin vacías | 16 | 13 | 21 | 17 | 12 |
| Paquetes a instalar | 2 | 1 | 2 | 1 | 1 |
| Peso de `node_modules` | 8,8 MB | 236 KB | 1,0 MB | 56 KB | 56 KB |
| Tipos inferidos del schema | Sí | No: `any` | Sí | Sí | No: `any` |
| Arranque, mediana de 15 | 164 ms | 137 ms | 175 ms | 132 ms | 132 ms |

- **Peso:** 8,1 MB de los 8,8 son Zod; `@runa-cmd/core` ocupa 720 KB.
- **Arranque:** Node vacío tarda 104 ms. Runa suma unos 60 ms, y commander unos 33.
- **Tipos:** se comprobó con `tsc --strict`, asignando el argumento a un tipo incorrecto. En commander y cac no hubo error: el valor es `any`, y hay que escribir los tipos a mano.

## Responder a quien usa la CLI

| Caso | Runa | commander | yargs | citty | cac |
|---|---|---|---|---|---|
| Falta un argumento | Exit 2, lo nombra | Exit 1, lo nombra | Exit 1, ayuda y error | Exit 1, ayuda | Exit 1, **stack trace** |
| Flag desconocida | Exit 2 | Exit 1 | Exit 1 | **Exit 0, la ignora** | Exit 1, **stack trace** |
| Comando mal escrito | Exit 127, sugiere | Exit 1, sugiere | Exit 1, ayuda | Exit 1, ayuda | **Exit 0, nada** |
| Sin comando | Exit 2, ayuda | Exit 1, ayuda | Exit 1, ayuda | Exit 1, ayuda | **Exit 0, nada** |
| `--help` y `--version` | Sí | Sí | Sí | Sí | Sí, si se piden |

Exit codes distintos para uso y comando inexistente solo en Runa. Que cac y citty den 0 ante un error es lo más grave de la tabla: un script cree que funcionó.

## Lo que rodea al código

| Paso | Runa | commander | yargs | citty | cac | oclif |
|---|---|---|---|---|---|---|
| Generador de proyectos | No | No | No | No | No | Sí |
| Prueba sin subproceso | `testCLI()` | Ajustes en la instancia | Ajustes en la instancia | Sin verificar | Sin verificar | Helper propio |
| Compilar para distribuir | Igual en todas | | | | | Lo resuelve el generador |
| CLI como tools de un agente | `--mcp` | No | No | No | No | No |

Lo de commander y yargs sale de su documentación, citada en [la investigación de pruebas](./2026-10-testcli-capture-spike.md) y en ADR-0041. citty y cac no se verificaron. `create-commander` existe en npm, en la versión `0.0.0`, así que no cuenta como generador.

**Preparar el proyecto cuesta lo mismo en todas:** `type: module`, `tsconfig`, shebang, `bin` y compilar antes de publicar son de Node y TypeScript, no de Runa. Por eso un generador sería una ventaja frente a casi todas, y no solo un arreglo propio.

## Dónde Runa cuesta más

1. **`@beta`:** sin eso, npm instala `0.1.0`. Desaparece con la 1.0.
2. **Zod aparte:** dos paquetes, 8 MB, y un import propio, `@runa-cmd/core/zod`. Zod es peer a propósito ([ADR-0001](../adr/0001-zod-como-fuente-de-verdad.md)).
3. **Separar `cli.ts` de `main.ts`:** hace falta para usar `testCLI()`, y ninguna otra herramienta lo pide para su forma básica.
4. **Conceptos:** `meta`, `args`, `options` y `run` en un objeto, como citty. Devolver en vez de imprimir es distinto a todas las demás.

## Seguimiento

**`import.meta.main` no evita separar `cli.ts` de `main.ts`.** La idea era arrancar la CLI solo cuando el archivo es el programa, como `if __name__ == '__main__'` en Python, y así tener un solo archivo. Según la documentación de Node, `import.meta.main` llegó en Node 24.2 con estabilidad 1.0, que significa desarrollo temprano. En Node 24.0 y 24.1, que la base del proyecto acepta ([ADR-0015](../adr/README.md)), vale `undefined`: la CLI no arrancaría y no avisaría nada. Se descartó. Se puede revisar cuando la base sea una versión de Node en la que sea estable.

**El generador existe:** `npm create @runa-cmd@beta my-tool` (T-605) crea los dos archivos, los tests y la configuración. Eso saca de la lista de arriba el punto 3, porque nadie tiene que separar los archivos a mano, y la parte de preparar el proyecto, que antes costaba lo mismo que con las demás. Entre las herramientas comparadas, solo oclif tenía generador.

**Pruebas sin subproceso, verificadas:** se escribieron las tres pruebas de la guía de inicio con commander, yargs, citty y cac, en las versiones de arriba. Las cuatro pasan con la CLI correcta y fallan 2 de 3 con el saludo cambiado. Todas se pueden probar en el mismo proceso, pero cada una necesita un helper propio que reemplaza `console.log`: 23 líneas en commander (`exitOverride` y `configureOutput`), 22 en yargs (`exitProcess(false)` y `fail`), 14 en citty (`runCommand`) y 16 en cac (`parse` con `run: false`). citty y cac no dan exit code, solo una excepción. Esto reemplaza "Ajustes en la instancia" y "Sin verificar" de la tabla. Está en la [guía comparativa](../../guides/runa-compared.md).

## Límites

Una sola CLI chica, en una máquina. Las líneas dependen del estilo de cada uno. No se midió la experiencia de alguien real, ni oclif. El peso de `node_modules` no incluye TypeScript.
