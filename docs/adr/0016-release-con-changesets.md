# ADR-0016: Changesets en pre-release, publicación local y grupo `fixed`

- **Estado:** aceptada
- **Drivers:** publicar sin olvidar dist-tags ni builds. Un token de automatización en CI saltea 2FA, y los tokens granulares vencen cada 90 días.
- **Decisión:** Changesets maneja versiones y changelogs. El workflow solo mantiene el PR "Version Packages". Se publica localmente con `pnpm release` y 2FA. Los cuatro paquetes forman un grupo `fixed`. Los peer ranges de `@runa-cmd/core` son explícitos, no `workspace:*`, y `onlyUpdatePeerDependentsWhenOutOfRange` está activo, porque si no, Changesets escala cada release a mayor.
- **Alternativas descartadas:** publicar con checklist manual olvida pasos. Versionar cada paquete por separado multiplica los peer ranges durante la beta. `NPM_TOKEN` en secretos es peor que publicar con 2FA.
- **Costo aceptado:** publicar es un paso manual, y hay que ampliar los peer ranges a mano al empezar una serie minor nueva.
- **Revisar si:** Trusted Publishing queda probado ([T-505](../backlog.md#t-505-trusted-publishing)), o se decide separar el grupo ([T-504](../backlog.md#t-504-grupo-de-versiones-de-los-paquetes)).
- **Código:** `.changeset/config.json`, `.github/workflows/release.yml`
