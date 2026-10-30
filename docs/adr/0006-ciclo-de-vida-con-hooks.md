# ADR-0006: Siete hooks, y cortes sin `process.exit`

- **Estado:** aceptada
- **Drivers:** los plugins necesitan intervenir en puntos conocidos. MCP y la ayuda deben cortar la ejecución antes de resolver el comando. Quien embebe Runa necesita que `cli.run()` termine y que `cleanup` corra.
- **Decisión:** existen `beforeParse`, `onGlobalFlags`, `afterParse`, `beforeRun`, `afterRun`, `onError` y `cleanup`, con handlers secuenciales. `onGlobalFlags` puede cortar con `ctx.shortCircuit()`. Los plugins no llaman a `process.exit`; `helpPlugin({ exitOnHelp: true })` es una salida opcional para recuperar el comportamiento de 0.1.0.
- **Alternativas descartadas:** `exitOnHelp` por defecto mantiene el bug: saltea `cleanup`, rompe el uso embebido y puede truncar stdout en pipes.
- **Costo aceptado:** un hook que corta debe seguir la convención; `core` no puede impedir un `process.exit` ajeno.
- **Revisar si:** aparece un caso real que no entra en estos siete hooks.
- **Código:** `packages/core/src/lifecycle.ts`, `packages/core/src/cli.ts`
- **Nota:** `cleanup` todavía no corre ante un error no manejado; ver KI-001 en [known issues](../known-issues.md).
