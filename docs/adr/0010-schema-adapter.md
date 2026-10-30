# ADR-0010: `SchemaAdapter` para introspección, con selección interna

- **Estado:** aceptada
- **Drivers:** una actualización menor de Zod no debería romper todo el parseo por depender de `._zod`.
- **Decisión:** `SchemaAdapter` solo responde sobre estructura: tipo, opcionalidad, default, enums y descripción. No valida; `resolve.ts` sigue llamando a Zod. Todo acceso a `._zod` queda en `parse/adapters/zod-v4.ts`. Los tipos son públicos, pero no hay opción `schemaAdapter`.
- **Alternativas descartadas:** que el adapter también valide duplica la superficie sin una segunda implementación. Standard Schema no expone introspección, así que no reemplaza al adapter. Una opción pública compromete la API antes de tiempo. Un registro por schema no aporta nada.
- **Costo aceptado:** soportar otra librería requiere también una costura de validación.
- **Revisar si:** existe una segunda implementación real.
- **Código:** `packages/core/src/parse/schema-adapter.ts`, `packages/core/src/parse/adapters/zod-v4.ts`
