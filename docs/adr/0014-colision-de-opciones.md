# ADR-0014: Detectar colisiones al arrancar

- **Estado:** aceptada
- **Drivers:** el extractor de globales podía robarle tokens a un comando sin avisar. Los plugins pueden agregar comandos y opciones en cualquier orden.
- **Decisión:** `validateOptionCollisions()` corre una vez, después del setup de plugins y antes de parsear. Revisa nombres y alias en todo el árbol y lanza `RunaError` con código `OPTION_COLLISION` y exit 1, indicando quién registró cada opción.
- **Alternativas descartadas:** validar en `addGlobalOption` depende del orden de registro. Validar en `defineCLI` es imposible con plugins diferidos. Una clase `ConfigError` agrega API sin beneficio.
- **Costo aceptado:** corre en cada ejecución y frena todo el CLI, incluso si el comando en conflicto no se usa.
- **Revisar si:** aparecen solapamientos legítimos. [ADR-0021](./0021-help-y-version-en-core.md) ya exceptúa las flags integradas.
- **Código:** `packages/core/src/plugin.ts`, `packages/core/src/__tests__/plugin-collisions.test.ts`
