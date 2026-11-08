# Problemas conocidos

> **Verificado:** 2026-10-31, sobre `0.2.0-beta.2` compilada desde `main`.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

No hay problemas abiertos de esta severidad.

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-041 | El campo `readme` del registro de npm está vacío, así que `npm view` no lo muestra. La página de npm sí muestra el README. Afecta sobre todo a un agente que lee la documentación con `npm view`; el archivo se puede leer igual desde el paquete, como `https://unpkg.com/@runa-cmd/core@beta/README.md` | Observado, también el 2026-11-08 en los cinco paquetes | Desconocida. La publicación envía el README, y las versiones declaran `readmeFilename: README.md` con el texto vacío. El 2026-11-08 cayeron dos hipótesis: que se llena desde `latest`, porque `@runa-cmd/create` tiene `latest` en `0.2.0-beta.5` desde su primera publicación y el campo sigue vacío; y que es npm 12, porque `0.1.0` se publicó con npm 11.12.1 y también está vacío. zod, commander y el SDK de MCP sí lo tienen | [T-506](./backlog.md#t-506-salir-de-pre-release-y-publicar-100) |

## Severidad baja

No hay problemas abiertos de esta severidad.
