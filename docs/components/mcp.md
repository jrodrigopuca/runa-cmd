# `@runa-cmd/mcp`

> **Fuente:** `packages/mcp/src` · **Verificado:** 2026-10-30 · **Guía de uso:** `packages/mcp/README.md`

Convierte una CLI en un servidor MCP (Model Context Protocol), el protocolo con el que los agentes descubren y llaman tools. Es la parte central del diferencial de Runa.

Cada tool corre en un subproceso de la propia CLI, así que es el mismo comando que corre una persona, con sus hooks, middleware, env y config ([ADR-0030](../adr/0030-tools-mcp-en-subproceso.md)).

## Uso

```ts
import { defineCLI } from '@runa-cmd/core';
import { mcpPlugin } from '@runa-cmd/mcp';

defineCLI({
  meta: { name: 'my-tool', version: '1.0.0' },
  commands: { deploy },
  plugins: [mcpPlugin()],
}).run();
```

```bash
my-tool --mcp
my-tool --mcp --profile prod
```

Una CLI de un comando usa `runCLI(cmd, { plugins: [mcpPlugin()] })`, y su tool toma el nombre de `meta.name`.

Las opciones globales que recibe el servidor al arrancar llegan a cada llamada.

## Opciones

| Opción | Efecto | Por defecto |
|---|---|---|
| `name` | Nombre del servidor | `meta.name` |
| `version` | Versión del servidor | `meta.version`, o `0.0.0` |
| `instructions` | Instrucciones para el agente | Ninguna |
| `selfCommand` | Cómo ejecutar la CLI de nuevo: ejecutable y argumentos | Repite cómo arrancó el proceso |

El servidor comprueba `selfCommand` al arrancar, y si no funciona falla con `MCP_SELF_CHECK_FAILED`. Se probó que un binario de `bun build --compile` funciona sin declararlo.

## Mapeo

| CLI | MCP |
|---|---|
| `deploy` | Tool `deploy` |
| `config get` | Tool `config_get` |
| `args` + `options` | Un solo `inputSchema`, en JSON Schema |
| `meta.description` | Descripción de la tool |
| `output` de tipo objeto | `outputSchema` |

## Respuestas

| Caso | Respuesta |
|---|---|
| Con `output` de tipo objeto | Texto JSON y `structuredContent` |
| Devuelve un string | Ese texto |
| Devuelve otro valor | JSON en texto |
| No devuelve nada | Lo que imprimió, o `Command '<name>' executed successfully.` |
| Lanza un error | `isError: true` con lo que escribió en stderr |
| No llegó a terminar | `isError: true` con `Command '<name>' did not finish.` |

El valor devuelto gana sobre stdout. Para detectar una tool dentro de un hook, usá `ctx.invocation.surface`.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `packages/mcp/src/plugin.ts` | Registra `--mcp` e inicia el servidor en `onGlobalFlags` |
| `packages/mcp/src/schema.ts` | Convierte comandos en registros de tools |
| `packages/mcp/src/server.ts` | Define las tools, atiende llamadas y arma resultados. Carga el SDK, por eso se importa en diferido |
| `packages/mcp/src/runner.ts` | Lanza el hijo y recoge su salida |
| `packages/core/src/tool-channel.ts` | Canal interno con el hijo, compartido por `@runa-cmd/core/internal` |

## Límites actuales

- **Cancelar mata al hijo sin correr `cleanup`,** y un proceso que él haya iniciado queda vivo ([T-305](../backlog.md#t-305-cancelación-y-límites)).
- **No hay tope de salida** ([T-305](../backlog.md#t-305-cancelación-y-límites)).
- **Los valores de quien opera siguen en el schema:** una opción con `env` figura como parámetro, y el modelo podría pisarla (KI-032).
- **No hay control de exposición.** Todos los comandos son tools (KI-007).
- **Un error no indica si se puede reintentar** ([T-304](../backlog.md#t-304-contrato-de-resultado-y-errores)).
- **No hay estado entre llamadas.** Cada una es un proceso nuevo: un pool de conexiones no se comparte.
- **Solo hay transporte stdio.**

Flujo: [llamada a una tool](../flows/mcp-tool-call.md). Decisiones: [ADR-0017](../adr/0017-mapeo-de-comandos-a-tools-mcp.md), [ADR-0025](../adr/0025-control-de-mcp-en-el-plugin.md), [ADR-0030](../adr/0030-tools-mcp-en-subproceso.md).
