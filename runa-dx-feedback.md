# Runa: observaciones de DX desde una migración real

**Objetivo:** que usar Runa sea cómodo y simple para devs, sobre todo en el caso más común: una CLI de un solo comando.

**Origen:** migración de `@qr-plus/cli` de commander a Runa (commit `d001f99` de `qr-code-generator`).

**Versiones probadas:** `@runa-cmd/core` y `@runa-cmd/help` `0.2.0-beta.0`, `zod` 4.6.7, Node 24.22.2.

**Cómo leer las evidencias:** todo lo marcado como "observado" se ejecutó contra esa beta publicada, salvo que se aclare otra cosa. Las secciones "Propuesta" son ideas para evaluar, no decisiones. En el repo de Runa (`4539bed`) solo busqué `kebab`, `camelCase` y `--version` en `packages/core/src` y `packages/help/src`, y no encontré ninguna implementación.

## Resumen

Runa resuelve muy bien el modelado: tipos inferidos desde Zod, validación y mensajes claros. La fricción aparece en lo que un dev da por hecho en una CLI de un comando: `--help`, `--version`, `--kebab-case` y `--`.

En qr-plus, el setup pasó de 45 líneas con commander a unas 170 con Runa. Parte es la declaración de opciones, más explícita con Zod. El resto son workarounds:

| Workaround en qr-plus | Motivo |
|---|---|
| `versionPlugin` | No existe `--version` |
| `renderHelp` y `formatOption` | La ayuda raíz no lista las opciones |
| Clave `"\0qr-plus"` en `commands` | El primer token puede consumirse como nombre del comando |
| `content` opcional y validación manual | Lo que va después de `--` no llena posicionales |
| Claves `"dark-color"` y mapeo a `darkColor` | No hay conversión a kebab-case |

**Criterio de éxito propuesto:** que qr-plus pueda borrar esos cinco workarounds sin cambiar su comportamiento.

## Lo que conviene conservar

Observado, y vale cuidarlo:

- `args` y `options` inferidos desde Zod llegan tipados a `run()`.
- Un typo en `meta.options` falla al compilar: `outptu` da `TS2561` con sugerencia.
- Los enums dan errores claros: `Invalid value for --ecl. Expected one of: L, M`.
- Los typos de flags se sugieren bien: `--outptu` da `Did you mean '--output'?`.
- Los errores de uso salen con código 2.
- Funcionan `--opt=valor`, opciones antes del posicional y `--no-*` en booleanos.
- `tool tool --help` ya renderiza una ayuda muy buena, con argumentos, tipos, enums y defaults. El problema es cómo se llega a ella, no el renderer.

## Prioridad 1: el camino feliz de un solo comando

### 1. `runCLI` no tiene `--help`

```console
$ tool --help
Unknown option: --help. Did you mean '--ecl'?    # exit 2
```

`runCLI` es la entrada más simple y la primera que prueba alguien, pero para tener ayuda hay que pasar a `defineCLI` y sumar `@runa-cmd/help`.

**Propuesta:** `--help` y `-h` funcionan por defecto en toda CLI. El plugin queda para temas y renderers propios.

**Costo:** `core` crece y hay que decidir cómo se reemplaza el renderer básico cuando el plugin está presente.

### 2. No existe `--version`

```console
$ tool --version
Unknown option: --version    # exit 2
```

Pasa aunque `meta.version` esté definido, y la ayuda sí muestra `tool v9.9.9`. Además, `runCLI` solo copia `name` y `description` al CLI que arma (leído en `cli.js` de `0.1.0`, no repetido en la beta), por lo que el `version` del comando no llegaría a ningún lado.

**Propuesta:** si hay `meta.version`, registrar `--version`. Para `-V`, definir qué pasa si colisiona con una opción del usuario: la beta ya lanza `OPTION_COLLISION` al arrancar.

### 3. La ayuda raíz trata a un comando único como un árbol

```console
$ tool --help
USAGE
  tool <command> [options]

COMMANDS
  tool  Sample tool

GLOBAL OPTIONS
  -h, --help    Show help [default: false]
```

No aparecen `<content>` ni las opciones, y sugiere una sintaxis que no es la real. `tool hola --help` muestra lo mismo. La ayuda correcta existe, pero solo con `tool tool --help`.

**Propuesta:** con un único comando, renderizar la ayuda de ese comando, sumando las opciones globales. Parece un cambio chico y es el de mayor impacto visible.

### 4. Colisión entre el contenido y el nombre del comando

```console
$ tool tool
content: Missing required argument: <content> — Text to encode    # exit 2
```

El modo de comando único consume el primer token si coincide con la clave. Hace falta `tool tool tool` para pasar `"tool"` como contenido. Es poco frecuente, pero sorprende: un dato válido del usuario cambia de significado.

**Propuesta:** hacer explícito el modo, por ejemplo `defineCLI({ command })` como alternativa excluyente de `commands`. En ese modo nunca se consume un token. `runCLI` lo usaría internamente.

**Costo:** una pieza más de API. A cambio, desaparece un comportamiento implícito y varias ramas de `resolveCommandFromTree`.

### 5. No hay kebab-case

```console
$ tool hola --dark-color '#111'
Unknown option: --dark-color. Did you mean '--darkColor'?    # exit 2
```

El idiomático en TypeScript (`darkColor`) produce un flag poco idiomático en terminal. La salida actual obliga a escribir `"dark-color"` y usar `options["dark-color"]`, y se pierde el acceso limpio por punto.

**Propuesta:** derivar `--dark-color` desde `darkColor` y mantener la clave en camelCase dentro de `run()`.

**Costo:** rompe a quien ya use `--darkColor`, salvo que se acepten ambos durante una transición. Mejor resolverlo antes de la versión estable.

### 6. `--` no llena posicionales

```console
$ tool -- -text
content: Missing required argument: <content> — Text to encode    # exit 2

$ tool hola -- -text
{"args":{"content":"hola"},...,"rest":["-text"]}
```

Es la forma convencional de pasar un valor que empieza con guion. La beta mandó todo a `ctx.rest` a propósito, y eso es útil para CLIs que envuelven otro comando (`tool run -- npm test`). El problema es que el posicional requerido nunca se llena. El workaround lo vuelve opcional, y por eso la ayuda ya no puede marcarlo como requerido por sí sola.

**Propuesta:** después de `--`, llenar primero los posicionales declarados y dejar el resto en `ctx.rest`. Así `tool -- -text` funciona y `tool run -- npm test` sigue igual si `run` no declara posicionales.

**Costo:** ajusta el cambio 4 de la beta, cuando todavía es barato hacerlo.

## Prioridad 2: mensajes y ayuda

### 7. Falta de valor reportada como valor inválido

```console
$ tool hola -e
ecl: Invalid value for --ecl. Expected one of: L, M
```

Lo esperable sería algo como `Option -e, --ecl requires a value`. Solo lo probé con un enum; falta revisar otros tipos.

### 8. Sugerencias demasiado permisivas

| Entrada | Sugerencia | Contexto |
|---|---|---|
| `--help` | `--ecl` | Probe con `runCLI` |
| `--nope` | `--size` | CLI de qr-plus |

`findSuggestion` aceptaba hasta distancia 3 en valor absoluto en `0.1.0`, y estos casos sugieren que en opciones sigue algo parecido. Falta confirmarlo en `packages/core/src/suggest.ts`. Conviene un umbral relativo a la longitud del nombre: una sugerencia mala confunde más que ninguna.

### 9. Ruido en la ayuda

- Booleanos con `[default: false]`, como `Show help [default: false]`. Aporta poco, porque es lo implícito.
- `content: Missing required argument: <content> — Text to encode` repite el nombre.

**Propuesta:** omitir defaults `false` y acortar a `Missing required argument: <content>`.

### 10. Errores sin salida hacia la ayuda

Los errores de uso no indican qué hacer después. Una línea como `Run 'tool --help' for usage.` ayuda, y más cuando la ayuda funcione siempre.

## Prioridad 3: instalación y documentación

### 11. Cantidad de piezas para empezar

Una CLI normal necesita `@runa-cmd/core`, `@runa-cmd/help` y `zod`. El lema "Zero runtime deps" es técnicamente cierto para `core`, pero `zod` es un peer obligatorio, y puede dar una expectativa equivocada.

**Propuesta:** decir "Zod es el único requisito". Si `--help` pasa a `core` (punto 1), `@runa-cmd/help` queda como opcional y el inicio se simplifica.

### 12. Versión desactualizada en el plugin de ayuda

`helpPlugin()` declara `version: '0.1.0'` en `dist/plugin.js` de la beta. Conviene derivarla del build o quitarla.

### 13. README y modo de comando único

El README de `0.1.0` muestra `runCLI` con `my-cli greet world`, lo que sugiere un subcomando obligatorio, y no explica que el nombre es opcional ni la colisión del punto 4. El modo solo se descubre leyendo `resolveCommandFromTree`. Revisar el README actual, porque no lo releí completo en la beta.

## Cómo podría quedar

Boceto, no diseño cerrado:

```ts
import { defineCommand, runCLI } from "@runa-cmd/core";
import { z } from "@runa-cmd/core/zod";

runCLI(
  defineCommand({
    meta: {
      name: "qr-plus",
      version: "1.0.0",
      description: "Generate QR codes from the terminal",
    },
    args: { content: z.string().describe("Text or URL to encode") },
    options: {
      darkColor: z.string().default("#000000").describe("Dark module color"),
      invert: z.boolean().default(false).describe("Invert colors"),
    },
    run({ args, options }) {
      // options.darkColor llega desde --dark-color
    },
  }),
);
```

Con esto debería funcionar, sin plugins:

```console
$ qr-plus --help          # ayuda completa
$ qr-plus --version       # 1.0.0
$ qr-plus hola --dark-color '#111'
$ qr-plus qr-plus         # codifica "qr-plus"
$ qr-plus -- -texto       # codifica "-texto"
```

## Decisiones abiertas

1. **API del comando único:** ¿`defineCLI({ command })`, un comando por defecto dentro de `commands`, o solo `runCLI`?
2. **`--help` y `--version`:** ¿en `core` por defecto, o en un preset?
3. **`--` y posicionales:** ¿llenarlos primero, o agregar una opción por comando?
4. **Kebab-case:** ¿solo kebab, o aceptar ambas formas durante una transición?
5. **`-V`:** ¿alias por defecto, o solo `--version`?
6. **Timing:** todo esto cambia comportamiento. Conviene definirlo antes de publicar la estable, para no arrastrarlo como breaking change.

## Casos para tests de aceptación

| Comando | Resultado esperado |
|---|---|
| `tool --help` y `tool -h` con `runCLI` | Código 0, ayuda con argumentos y opciones |
| `tool hola --help` | Igual que `tool --help` |
| `tool --version` y `tool hola --version` | Código 0, imprime la versión |
| `tool hola --dark-color '#111'` | `options.darkColor === "#111"` |
| `tool tool` | `args.content === "tool"` |
| `tool -- -text` | `args.content === "-text"` |
| `tool hola -- -text` | `args.content === "hola"`, `rest` con `["-text"]` |
| `tool a b` | Código 2, argumento inesperado |
| `tool hola -e` | Código 2, indica que falta el valor |
| `tool hola --outptu x` | Código 2, sugiere `--output` |
| `tool hola --nope` | Código 2, sin sugerencia irrelevante |

## Referencia en qr-plus

Los workarounds están en `packages/cli/src/index.ts`, en el repo `jrodrigopuca/qr-code-generator`. Cuando Runa los resuelva, conviene volver a correr ahí la comparación de comportamiento: la CLI declara exacta la versión `0.2.0-beta.0`, así que el cambio de versión va a ser explícito.
