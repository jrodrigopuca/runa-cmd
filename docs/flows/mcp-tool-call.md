# Llamada a una tool MCP

> **Fuente:** `packages/mcp/src`, `packages/core/src/tool-channel.ts` · **Verificado:** 2026-10-30

Cada tool es el mismo comando que corre una persona, ejecutado en un subproceso de la propia CLI ([ADR-0030](../adr/0030-tools-mcp-en-subproceso.md)).

```mermaid
sequenceDiagram
    participant A as Agente
    participant S as Servidor MCP
    participant H as Hijo (la misma CLI)
    Note over S: mycli --mcp
    S->>H: ping
    H-->>S: pong
    A->>S: initialize
    A->>S: tools/call deploy
    S->>H: Proceso nuevo, entrada JSON por fd 3
    Note over H: Plugins, globales, validación,<br/>hooks, middleware, run()
    H-->>S: ran, por fd 4
    Note over H: Valida output
    H-->>S: result, por fd 4
    Note over H: afterRun y cleanup
    H-->>S: Fin, con exit code
    S-->>A: Resultado
```

## Arranque

1. `mcpPlugin` registra `--mcp` como opción global.
2. En `onGlobalFlags`, si la flag está activa, carga el SDK. Una ejecución normal de la CLI no paga ese costo.
3. Se ejecuta a sí mismo con un `ping`. Si no recibe `pong`, falla con `MCP_SELF_CHECK_FAILED` y sugiere `selfCommand`.
4. Atiende por stdio hasta que el cliente se desconecta o recibe SIGINT o SIGTERM. Recién ahí sigue el ciclo de vida, y corren los `cleanup` del servidor.

## Cada llamada

- **Entrada:** se descartan las opciones que fijó quien opera ([ADR-0031](../adr/0031-quien-opera-gana-al-modelo.md)), y el resto viaja sin validar, como JSON por fd 3. La valida el hijo, así que un `.transform` corre una sola vez, y los errores son los de la CLI.
- **Comando:** se elige por su ruta, no por tokens. Un dato nunca puede ejecutar otro comando.
- **Globales:** el hijo recibe el argv con que arrancó el servidor, sin `--mcp`.
- **Entorno:** el hijo hereda el del servidor. La variable del canal se borra al leerla, así que una CLI que lance el comando es una CLI normal.
- **Procesos:** stdin queda cerrado, y stdout y stderr son del comando.

## Cómo se arma el resultado

El hijo informa hasta dónde llegó: `running` antes de `run()`, `ran` cuando vuelve, y `result` cuando todo el comando terminó y su `output` es válido. Si termina en error, `failed` indica si fue la entrada, el `output` u otra cosa. Stdout y stderr pasan por la redacción de valores fijos; el valor devuelto, no.

| Hijo | Clase | Efecto |
|---|---|---|
| Se pidió detenerlo | `cancelled` | `unknown` |
| `oversized` | `output_too_large` | `completed` |
| `result`, exit 0, sin `failed` | Éxito: el valor como texto, o stdout, más `structuredContent` si `output` es un objeto | |
| `result` con `failed` o exit distinto de 0 | `after_run_failed` | `completed` |
| `ran` y `failed` por `output` | `invalid_output` | `completed` |
| `ran`, otro caso | `after_run_failed` | `completed` |
| `running` y `failed` | `command_failed` | `unknown` |
| `running`, sin `failed` | `crashed` | `unknown` |
| Sin `running`, `failed` por entrada | `invalid_input` | `none` |
| Sin `running`, otro `failed` | `rejected` | `none` |
| Sin informes, exit 0 | `not_run` | `none` |
| Sin informes, exit distinto de 0 | `crashed` | `none` |

Exit 0 no alcanza para considerar exitosa una llamada: un middleware puede saltear el comando, y un comando puede llamar a `process.exit(0)`.

El texto lleva el motivo que escribió el comando y una frase sobre el efecto, porque `_meta` es para el cliente y puede no llegar al modelo. Las pistas para personas, como `RUNA_DEBUG` o `--help`, no aparecen salvo que quien opera active `RUNA_DEBUG`.

## CLI y tool

| Etapa | CLI | Tool |
|---|---|---|
| Elegir comando | Desde argv | Por ruta |
| Valores | Tokens de `parseArgs` | Objeto JSON |
| Env, config, globales | Sí | Sí |
| Hooks y middleware | Sí | Sí |
| `ctx.invocation` | `{ surface: 'cli' }` | `{ surface: 'tool', tool }` |
| Latencia | Directa | Medida: 138 ms de mediana por llamada, en una CLI mínima |

## Cómo se detiene

Sigue [ADR-0033](../adr/0033-parar-recorre-el-arbol-de-procesos.md). Cada hijo lidera su grupo de procesos y mantiene un canal IPC con el servidor.

En Windows, el hijo también se lanza `detached`. Sin eso, libuv lo mete en un job con `KILL_ON_JOB_CLOSE`, y Windows lo mata junto con el servidor, sin correr `cleanup`. Lo mismo vale para un comando: en Windows, un proceso que deba sobrevivirlo tiene que lanzarse `detached`.

| Qué pasa | Hijo | Servidor |
|---|---|---|
| El cliente cancela | Se corta el canal: `ctx.signal`, `cleanup`, y termina su grupo | Fuerza el árbol a los 5 s si sigue vivo |
| El servidor se cierra | Igual, por cada llamada en curso | Responde esas llamadas y recién ahí sigue su ciclo de vida |
| El servidor muere con `SIGKILL` | El canal se corta igual, y se detiene solo | |
| Sale por otro camino | | Al salir, termina el árbol de cada hijo en curso |

La llamada termina cuando sale el hijo, más 250 ms para recibir lo que escribió. Si terminó bien, un proceso que el comando dejó corriendo sigue vivo: pudo lanzarlo a propósito. Esos 250 ms son criterio propio: lo medido en macOS fue 0,05 ms de máximo, y el margen es para una máquina cargada.

## Tope de salida

- **Stdout y stderr:** se guarda el inicio y el final, y en el medio un aviso con los bytes omitidos. La memoria queda acotada aunque el comando escriba 600 MB.
- **Redacción:** cada extremo guarda bytes de más, que se descartan después de redactar. Así, un valor fijo cortado por la mitad no queda visible.
- **Valor devuelto:** no se trunca, porque un JSON cortado no sirve. Lo mide el hijo, que informa `oversized` en lugar del valor.
- **Origen de los 100 KiB:** unos 25.000 tokens, a razón de 4 caracteres por token. Es el límite por defecto de Claude Code, el único cliente que revisamos.
