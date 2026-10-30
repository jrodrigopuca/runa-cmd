# ADR-0008: `core` hace el merge; los loaders solo leen

- **Estado:** aceptada
- **Drivers:** la prioridad de valores debe ser igual para todos los formatos. `core` no debe depender de parsers de YAML o TOML.
- **Decisión:** la prioridad es CLI, env, config y default de Zod. `core` incluye un loader JSON. Un `ConfigLoader` solo declara `extensions` y `load()`.
- **Alternativas descartadas:** que cada loader haga el merge genera inconsistencias. Una config de todo o nada pierde la sobrescritura progresiva.
- **Costo aceptado:** otros formatos requieren un loader externo.
- **Revisar si:** un formato necesita mergear por capas, como config de proyecto y de usuario.
- **Código:** `packages/core/src/config/merge.ts`, `packages/core/src/config/search.ts`, `packages/core/src/parse/resolve.ts`
- **Nota:** los booleanos con default no respetan este orden; ver KI-002 en [known issues](../known-issues.md).
