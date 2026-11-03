# Release

> **Fuente:** `.github/workflows/release.yml`, `.changeset/` · **Verificado:** 2026-10-30

```mermaid
flowchart TD
    A["Cambio con changeset en main"] --> B["Workflow Release"]
    B --> C["PR Version Packages"]
    C --> D["Merge del PR"]
    D --> E["git pull"]
    E --> F["pnpm release, con OTP de npm"]
    F --> G["Publica bajo dist-tag beta"]
    G --> H["git push --follow-tags"]
    H --> I["npm view: comprobar dist-tags"]
```

## Reglas

- Un paquete que empieza a usar algo nuevo de `core` sube su peer a la versión que lo trae, antes de publicar. Hoy, `@runa-cmd/mcp` y `@runa-cmd/completions` piden `^0.2.0-beta.4`, por `tool`, `configurable` y `api.getConfigValues(path)`.
- Los cuatro paquetes se versionan juntos, como grupo `fixed`, hasta publicar la 1.0.0. Después cada uno tiene su versión ([ADR-0039](../adr/0039-paquetes-independientes-desde-1-0.md)).
- Mientras dure el modo pre-release, las versiones son `0.2.0-beta.N`, y `latest` no cambia.
- CI no publica: no hay `NPM_TOKEN`.
- Los peer ranges de `core` son explícitos. Si empieza una serie minor nueva y no se amplían, Changesets escala el release a mayor.

Pasos detallados en `CONTRIBUTING.md`. Decisión en [ADR-0016](../adr/0016-release-con-changesets.md).

## Camino a 1.0.0

[T-506](../backlog.md#t-506-salir-de-pre-release-y-publicar-100) define la salida de pre-release, y [T-505](../backlog.md#t-505-trusted-publishing), opcional, la publicación desde CI.
