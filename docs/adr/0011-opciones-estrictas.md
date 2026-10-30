# ADR-0011: Rechazar flags desconocidas después de parsear

- **Estado:** aceptada
- **Drivers:** una flag mal escrita no debe ignorarse en silencio. Globales y opciones de comando se parsean en dos pasadas.
- **Decisión:** `parseArgs` sigue con `strict: false`. `parse/strict.ts` compara las claves producidas con las registradas y lanza `ValidationError` (exit 2) con una sugerencia. Las sugerencias viven en `suggest.ts`, compartido con comandos no encontrados. `strictOptions: false` restaura el modo permisivo.
- **Alternativas descartadas:** `strict: true` da errores opacos y rompe las dos pasadas. Hacerlo opcional mantiene el bug por defecto. Validar tokens crudos duplica la tokenización.
- **Costo aceptado:** con `strict: false` hay casos que requieren manejo propio, como la falta de valor.
- **Revisar si:** la cantidad de casos especiales supera lo que ahorra `parseArgs`.
- **Código:** `packages/core/src/parse/strict.ts`, `packages/core/src/suggest.ts`
