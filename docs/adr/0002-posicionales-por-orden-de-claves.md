# ADR-0002: Posicionales por orden de claves; variádico solo al final

- **Estado:** aceptada
- **Drivers:** cada argumento debe tener nombre para que TypeScript infiera su tipo, y también posición para parsearlo. ES2015+ garantiza el orden de inserción de claves string.
- **Decisión:** `args` es un objeto, y su orden define la posición. Solo el último puede ser `z.array()`, y solo uno por comando. `defineCommand` lo valida al definir. Un posicional sin variádico que sobra es un error de uso.
- **Alternativas descartadas:** un array pierde la inferencia por argumento. Un campo `position` agrega código repetitivo y posibles conflictos.
- **Costo aceptado:** reordenar claves cambia la interfaz de la CLI.
- **Revisar si:** hace falta un variádico que no sea el último argumento.
- **Código:** `packages/core/src/parse/variadic.ts`, `packages/core/src/parse/resolve.ts`
