# `@runa-cmd/core`

> **Fuente:** `packages/core/src` · **Verificado:** 2026-10-30 · **Guía de uso:** `packages/core/README.md`

El motor de Runa: define comandos, parsea argv, resuelve valores, ejecuta el ciclo de vida y aloja plugins.

## API pública

Entradas: `@runa-cmd/core` y `@runa-cmd/core/zod`, que reexporta `z`.

| Export | Uso |
|---|---|
| `defineCommand(config)` | Crea un comando tipado. Valida variádicos y claves de `meta.options` al definir |
| `defineCLI(config)` | Crea una CLI con `.run(argv?)` |
| `runCLI(command, argv?)` | Atajo para un comando. Hoy no acepta plugins y solo conserva `name` y `description` |
| `defineMiddleware(fn)` | Crea un middleware |
| `definePlugin(config)` | Valida y devuelve un plugin |
| `getSchema(config, ...)` | Devuelve la introspección de la CLI |
| `jsonLoader()` | Loader de config JSON |
| `RunaError`, `ValidationError`, `CommandNotFoundError`, `CommandError` | Errores |
| `HOOK_NAMES`, `PARAM_TYPES` | Constantes |

Los tipos públicos están en `packages/core/src/index.ts`.

## Definir un comando

```ts
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const deploy = defineCommand({
  meta: {
    name: 'deploy',
    description: 'Deploy a service',
    options: { env: { alias: ['-e'], env: 'DEPLOY_ENV' } },
  },
  args: { service: z.string().describe('Service name') },
  options: { env: z.enum(['staging', 'production']).describe('Target') },
  output: z.object({ url: z.string() }),
  run({ args, options }) {
    return { url: `https://${options.env}.example.com/${args.service}` };
  },
});

runCLI(deploy);
```

- **`args`:** posicionales, por orden de claves. Solo el último puede ser `z.array()`.
- **`options`:** Zod puro. Alias, env, grupo, deprecación y hint van en `meta.options`.
- **`output`:** si existe, `run()` debe cumplirlo; se comprueba en compilación y en ejecución.
- **`run(ctx)`:** recibe `args`, `options`, `globalOptions`, `command`, `rawArgs` y `rest`.

## `defineCLI`

```ts
interface CLIConfig {
  meta: CLIMeta;
  commands: CommandTree;
  plugins?: Array<PluginConfig | (() => Promise<{ default: PluginConfig }>)>;
  middleware?: Middleware[];
  config?: CLIConfigOptions;
  globalOptions?: Record<string, ZodType>;
  globalMeta?: { options?: Record<string, OptionMeta> };
  strictOptions?: boolean; // true por defecto
}
```

`commands` es un árbol: `{ deploy, config: { get, set } }`.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `packages/core/src/cli.ts` | Orquesta la ejecución, resuelve comandos y compone middleware |
| `packages/core/src/command.ts` | `defineCommand` y sus validaciones |
| `packages/core/src/lifecycle.ts` | Registro y emisión de hooks |
| `packages/core/src/plugin.ts` | Host de plugins, orden topológico, capacidades y colisiones |
| `packages/core/src/introspect.ts` | `getSchema()` |
| `packages/core/src/errors.ts` | Jerarquía de errores |
| `packages/core/src/suggest.ts` | Levenshtein y sugerencias |
| `packages/core/src/parse/parseargs-bridge.ts` | Traduce schema a configuración de `parseArgs` |
| `packages/core/src/parse/strict.ts` | Rechaza flags desconocidas |
| `packages/core/src/parse/resolve.ts` | Mapea posicionales, resuelve valores, valida y humaniza errores |
| `packages/core/src/parse/schema-walker.ts` | Convierte schemas en `ParamMetadata` |
| `packages/core/src/parse/schema-adapter.ts` | Interfaz de introspección |
| `packages/core/src/parse/adapters/zod-v4.ts` | Único módulo que toca `._zod` |
| `packages/core/src/parse/variadic.ts` | Reglas de variádicos |
| `packages/core/src/config/` | Búsqueda, carga y orquestación de config |

## Resolución de valores

La prioridad es **CLI, env, config y default de Zod**. El detalle está en [parseo](../flows/argument-parsing.md). Hoy los booleanos con default no la respetan (KI-002 en [known issues](../known-issues.md)).

## Config

`config: { name: 'mycli' }` busca `mycli.config.json` en `.` y `~`; gana el primero que encuentra. `loaders` agrega formatos, y `searchPaths` cambia dónde busca. El archivo debe contener un objeto plano.

## Errores y salida

| Error | Código | Exit |
|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 2 |
| `CommandNotFoundError` | `COMMAND_NOT_FOUND` | 127 |
| `CommandError` | Configurable | Configurable, 1 por defecto |
| `RunaError` | Configurable | 1 por defecto |
| Otro error | No aplica | 1 |

Códigos usados por `RunaError`: `OPTION_COLLISION`, `INVALID_PLUGIN`, `PLUGIN_LOAD_ERROR`, `PLUGIN_MISSING_DEPENDENCY`, `PLUGIN_CIRCULAR_DEPENDENCY`, `PLUGIN_CAPABILITY_VIOLATION`, `INVALID_META_OPTIONS`, `INVALID_VARIADIC_ARGS` e `INVALID_VARIADIC_POSITION`.

Si `onError` no marca `ctx.handled`, `core` imprime el mensaje en stderr y llama a `process.exit`.

## Hooks y middleware

Están en [ciclo de vida](../flows/cli-lifecycle.md). El middleware recibe `next` y `globalOptions`, no los argumentos del comando.

## Crear un plugin

```ts
import { definePlugin } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

export const verbose = definePlugin({
  meta: { name: 'verbose', version: '1.0.0' },
  capabilities: { addGlobalOptions: true },
  setup(api) {
    api.addGlobalOption('verbose', z.boolean().default(false));
    api.hook('beforeRun', (ctx) => {
      if (ctx.globalOptions?.verbose) console.error('verbose on');
    });
  },
});
```

`PluginAPI` ofrece `addCommand`, `addGlobalOption`, `addMiddleware`, `hook`, `getSchema` y `getCommands`. Ver [carga de plugins](../flows/plugin-setup.md).

## Tests

- Viven en `packages/core/src/__tests__`.
- `types.test-d.ts` cubre la inferencia y corre con `pnpm test`. Usa `packages/core/tsconfig.test.json`, porque `tsconfig.json` excluye los tests y `tsc` no los abriría.
- `parseargs-negation.test.ts` fija el comportamiento de `parseArgs`.
- Muchos tests mockean `process.exit`. Para validar salida real usá `packages/core/src/__tests__/acceptance/single-command.test.ts`, que lanza un proceso real ([tests de aceptación](../process.md#tests-de-aceptación)).

## Decisiones

[ADR-0001](../adr/0001-zod-como-fuente-de-verdad.md), [0002](../adr/0002-posicionales-por-orden-de-claves.md), [0003](../adr/0003-parseargs-extrae-zod-valida.md), [0004](../adr/0004-sistema-de-plugins.md), [0006](../adr/0006-ciclo-de-vida-con-hooks.md), [0007](../adr/0007-middleware-onion.md), [0008](../adr/0008-config-merge-en-core.md), [0009](../adr/0009-errores-y-codigos-de-salida.md), [0010](../adr/0010-schema-adapter.md), [0011](../adr/0011-opciones-estrictas.md), [0013](../adr/0013-coercion-numerica.md), [0014](../adr/0014-colision-de-opciones.md).
