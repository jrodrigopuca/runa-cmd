# ADR-0013: Un solo punto de coerción numérica, sin inventar valores

- **Estado:** aceptada
- **Drivers:** `Number('') === 0` convertía `--port ""` en `0`. El bug estaba repetido en CLI, env y config.
- **Decisión:** `coerceNumberValue()` se usa en las tres fuentes y deja intactos los strings vacíos o de espacios. Zod los rechaza por la ruta de errores normal, con exit 2.
- **Alternativas descartadas:** lanzar el error desde el helper crea una segunda ruta de mensajes. `z.coerce.number()` altera los schemas del usuario y su introspección.
- **Costo aceptado:** el mensaje es genérico, sin mencionar que el valor estaba vacío.
- **Revisar si:** ese mensaje genera confusión en uso real.
- **Código:** `packages/core/src/parse/resolve.ts`
