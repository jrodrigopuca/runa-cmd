# Revalidación de qr-plus con `0.2.0-beta.1`

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿el trabajo de las fases 1 a 4 resolvió lo que encontró la [migración de qr-plus](./2026-10-qr-plus-migration.md)?

**Respuesta:** en gran parte. Salieron cuatro de los cinco workarounds, el quinto quedó en 5 líneas, y aparecieron tres fricciones nuevas.

## Método

Se ejecutó el binario real de `@qr-plus/cli` con 35 invocaciones antes y después de migrar, sobre Runa `0.2.0-beta.0` y `0.2.0-beta.1`, comparando exit code, stdout, stderr y los archivos generados. El cambio se limitó a `packages/cli`, salvo el lockfile. qr-plus no usa MCP, así que esta revalidación no lo cubre.

## Resultado

| Medida | Antes | Después |
|---|---|---|
| Líneas de setup de la CLI | 165 | 82 |
| Líneas del archivo | 439 | 348 |
| Dependencias `@runa-cmd/*` | 2 | 1 |
| Pruebas e2e de qr-plus | 41 pasan | 41 pasan |

| Workaround | Estado |
|---|---|
| `versionPlugin` | Borrado |
| `renderHelp` y `formatOption` | Borrados |
| Clave `"\0qr-plus"` | Borrada, con `runCLI` |
| Claves `"dark-color"` y mapeo | Borrados |
| `content` opcional y validación manual | `content` es obligatorio; quedan 5 líneas para rechazar lo que sobra después de `--` |

## Diferencias de comportamiento

De 35 casos, 22 son idénticos.

| Casos | Diferencia | Lectura |
|---|---|---|
| 8 | Los errores de uso terminan con `Run 'qr-plus --help' for usage.`; algunos también mejoran su mensaje | Mejora |
| 3 | Cambia el formato de la ayuda | Esperado |
| 1 | `--nope` ya no sugiere `--size` | Mejora |
| 1 | `-V` dejó de existir | Pérdida |

## Fricciones nuevas

- **Lo que sobra después de `--` se pierde en silencio.** Sin una validación propia, `qr-plus a -- b` genera el QR de `a` e ignora `b`, con exit 0. Una CLI que no lee `ctx.rest` no tiene cómo enterarse: [T-209](../backlog.md#t-209-lo-que-sobra-después-de----no-se-pierde).
- **La ayuda perdió el nombre del valor.** `--dark-color <hex>` pasó a ser `--dark-color <string>`, porque `hint` se eliminó por no tener efecto en el renderer, aunque qr-plus lo leía desde su renderer propio: [T-210](../backlog.md#t-210-nombre-del-valor-en-la-ayuda).
- **`-V` no se puede recuperar sin volver a un plugin propio.** ADR-0021 lo descartó porque solo commander lo usa, y qr-plus viene de commander. El README de qr-plus no lo documenta.

También apareció un bug, ya corregido en `main`: la ayuda de `core` mostraba `(default: false)`, que el plugin omite.

Todavía es la evidencia de una sola CLI, del propio autor de Runa.
