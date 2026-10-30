# ADR-0026: `docs/` como fuente de verdad

- **Estado:** aceptada
- **Drivers:** `RUNA-SPEC.md` y `openspec/` estaban ignorados por git, mientras `CONTRIBUTING.md` y unas 50 referencias en código y tests los citaban. Una persona o un modelo que clona el repo no podía leerlos. El spec además había quedado desactualizado.
- **Decisión:** `docs/` es la fuente de verdad versionada: componentes, flujos, ADRs, backlog, estado, known issues e investigación. Se escribe para personas y modelos LLM. `RUNA-SPEC.md` y `openspec/` se retiran, después de migrar lo vigente. El trabajo sigue el ciclo de [process.md](../process.md), controlado por `pnpm docs:check`.
- **Alternativas descartadas:** publicar el spec y `openspec/` mantiene miles de líneas con material obsoleto. Usar solo ADRs no cubre componentes ni flujos.
- **Costo aceptado:** documentar forma parte de cada tarea, y hay documentos que mantener. Un control automático comprueba que código, tests y docs cambien juntos, pero no puede demostrar en qué orden se hicieron.
- **Revisar si:** el control genera más excepciones que correcciones, o los documentos vuelven a desincronizarse.
- **Código:** `scripts/check-docs.mjs`, `.githooks/commit-msg`, `AGENTS.md`
