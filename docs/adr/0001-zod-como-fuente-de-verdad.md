# ADR-0001: Zod v4 como fuente de verdad y peer dependency

- **Estado:** aceptada
- **Drivers:** un mismo schema debe producir tipos, validación, ayuda, completions y tools MCP, sin duplicar nada. `core` no tiene dependencias de runtime.
- **Decisión:** `args`, `options` y `output` son schemas Zod puros. Alias, env, grupos y deprecación van en `meta.options`, cuyas claves son un subconjunto de `options` por tipos y al definir el comando. Zod es peer dependency, y `core` lo reexporta en `@runa-cmd/core/zod`.
- **Alternativas descartadas:** un formato propio de schema pierde inferencia y validación. Empaquetar Zod quita al usuario el control de la versión.
- **Costo aceptado:** Zod es obligatorio para usar Runa, aunque no cuente como dependencia de runtime de `core`. Hay que decirlo claro.
- **Revisar si:** usuarios reales piden Valibot o ArkType. Ver [ADR-0010](./0010-schema-adapter.md).
- **Código:** `packages/core/src/types.ts`, `packages/core/src/command.ts`, `packages/core/src/zod.ts`
