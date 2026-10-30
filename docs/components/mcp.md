# `@runa-cmd/mcp`

> **Fuente:** `packages/mcp/src` · **Verificado:** 2026-10-30 · **Guía de uso:** `packages/mcp/README.md`

Convierte una CLI en un servidor MCP (Model Context Protocol), el protocolo con el que los agentes descubren y llaman tools. Es la parte central del diferencial de Runa.

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
```

## Opciones

| Opción | Efecto | Por defecto |
|---|---|---|
| `name` | Nombre del servidor | `meta.name` |
| `version` | Versión del servidor | `meta.version`, o `0.0.0` |
| `instructions` | Instrucciones para el agente | Ninguna |

## Mapeo

| CLI | MCP |
|---|---|
| `deploy` | Tool `deploy` |
| `config get` | Tool `config_get` |
| `args` + `options` | Un solo `inputSchema` |
| `meta.description` | Descripción de la tool |
| `output` | `outputSchema` |

## Respuestas

| Caso | Respuesta |
|---|---|
| Con `output` | Texto JSON y `structuredContent` |
| Devuelve un string | Ese texto |
| Devuelve otro valor | JSON en texto |
| No devuelve nada | `Command '<name>' executed successfully.` |
| Lanza un error | `isError: true` con el mensaje |

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `packages/mcp/src/plugin.ts` | Registra `--mcp` e inicia el servidor en `onGlobalFlags` |
| `packages/mcp/src/schema.ts` | Convierte comandos en registros de tools |
| `packages/mcp/src/server.ts` | Crea el servidor, registra tools y atiende señales |

## Límites actuales

Estas limitaciones afectan directamente el uso real:

- **La salida impresa se pierde.** `console.log` no llega al agente y ensucia stdout (KI-003).
- **`runCLI` no acepta plugins.** Una CLI de un comando debe usar `defineCLI` (KI-004).
- **No hay control de exposición.** Todos los comandos son tools (KI-007).
- **No corre el pipeline de la CLI.** `run()` se llama directo, sin middleware, hooks, env ni config, y `globalOptions` llega vacío (KI-008).
- **Solo hay transporte stdio.**

Mientras tanto, para que una tool sea útil, el comando debe **devolver** su resultado y no imprimirlo.

Flujo: [llamada a una tool](../flows/mcp-tool-call.md). Decisiones: [ADR-0017](../adr/0017-mapeo-de-comandos-a-tools-mcp.md), [ADR-0025](../adr/0025-control-de-mcp-en-el-plugin.md).
