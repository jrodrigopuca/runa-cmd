# Por qué `npm view` no muestra el README

> **Fecha:** 2026-11-02. Documento histórico: no se actualiza.

**Pregunta:** ¿por qué el campo `readme` del registro está vacío en los paquetes de Runa (F-05)?

**Respuesta:** la publicación envía el README, así que el problema no está en cómo se empaqueta. No se pudo confirmar la causa sin publicar: la explicación más probable es que el campo se llena desde `latest`, y `latest` sigue en `0.1.0`. La página de npm sí muestra el README, confirmado por el mantenedor.

## Lo observado

Con un registro falso en `127.0.0.1`, que no guarda nada, se capturó lo que envía cada herramienta para un paquete de prueba:

| Herramienta | README enviado en la versión |
|---|---|
| `npm publish`, desde carpeta (npm 12.2.1) | Sí, 40 bytes |
| `npm publish`, desde tarball | Sí, 40 bytes |
| `pnpm publish` (pnpm 10.33.0) | Sí, 40 bytes |

En el registro real, consultado el 2026-11-02:

| Paquete | `readme` general | `readme` en la versión `latest` |
|---|---|---|
| `@runa-cmd/core`, `@runa-cmd/mcp` | Vacío | Vacío |
| `zod`, `commander`, `vite`, `@changesets/cli` | Con contenido | Vacío |

- `npm view zod@3.23.8 readme` da lo mismo que `zod@latest`: `npm view` lee el campo general, no el de esa versión.
- El tarball de `@runa-cmd/core@0.1.0` incluye `README.md`.

## Lo que no se sabe

- Si el campo se llena con cada publicación de `latest`: se deduce de lo anterior, no hay fuente oficial.
- Por qué quedó vacío en `0.1.0`. Se publicó con npm 11.12.1.
- Un [PR de otro proyecto](https://github.com/bymaxone/nest-queue/pull/66) atribuye un caso parecido a `pnpm publish`, y lo resolvió con `npm publish`. Acá `pnpm publish` envió el README, así que no alcanza como explicación, pero es la primera alternativa si el problema sigue.

## Qué se hace

Una beta no puede comprobarlo, porque no cambia `latest`. Se comprueba al publicar la 1.0.0, en [T-506](../backlog.md#t-506-salir-de-pre-release-y-publicar-100). Si sigue vacío, hay que probar `npm publish` en lugar de `changeset publish` con pnpm.

**Cuidado con esa alternativa:** los paquetes no tienen `LICENSE` propio, y el tarball publicado sí lo trae: `npm pack` no lo incluye, así que todo indica que lo agrega `pnpm publish` desde la raíz. Antes de pasar a `npm publish` hay que copiar el `LICENSE` a cada paquete.
