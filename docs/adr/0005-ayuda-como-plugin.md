# ADR-0005: La ayuda vive solo en un plugin

- **Estado:** reemplazada por [ADR-0021](./0021-help-y-version-en-core.md)
- **Drivers:** mantener `core` sin interfaz propia y que la ayuda se pueda reemplazar por completo.
- **Decisión:** `--help` lo aporta `@runa-cmd/help`. `core` solo expone el schema con `getSchema()`.
- **Alternativas descartadas:** incluir el renderer completo en `core`.
- **Costo aceptado:** una CLI recién creada no tiene `--help`.
- **Revisar si:** ese costo frena la adopción. Sucedió en la migración de qr-plus.
- **Código:** `packages/help/src/plugin.ts`
