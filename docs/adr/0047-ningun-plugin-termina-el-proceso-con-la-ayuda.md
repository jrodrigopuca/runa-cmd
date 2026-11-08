# ADR-0047: Ningún plugin termina el proceso al mostrar la ayuda

- **Estado:** aceptada
- **Modifica:** [ADR-0006](./0006-ciclo-de-vida-con-hooks.md), que dejaba `helpPlugin({ exitOnHelp: true })` como salida opcional
- **Drivers:** `exitOnHelp` existía para recuperar el `process.exit(0)` de la 0.1.0, que ADR-0006 llama bug: saltea `cleanup`, rompe el uso embebido y puede cortar stdout en un pipe. Además salía con 0 sin nada que correr, contra [ADR-0034](./0034-sin-nada-que-correr-es-un-error-de-uso.md), y no estaba en el README de `help`. La revisión antes de v1 lo encontró el 2026-11-08 (T-237). Corregirla la dejaba como contrato para siempre, y deprecarla obligaba a mantenerla durante toda la 1.x. No se conoce a nadie que la use.
- **Decisión:** `exitOnHelp` se retira de `HelpPluginOptions` en la `0.2.0-beta.7`. La ayuda termina como cualquier comando: `core` decide el exit code, 0 con `--help` y 2 sin nada que correr, y corre `cleanup`. Pasarla en TypeScript es un error de tipos. En JS, `helpPlugin({ exitOnHelp })` avisa por stderr al arrancar que se retiró, y la CLI sigue, porque la ayuda ya sale bien sin ella.
- **Alternativas descartadas:** corregirla para que salga con el código de `core` sigue salteando `cleanup`. Deprecarla con un aviso de Node mantiene durante toda la 1.x una opción que existe para recuperar un bug.
- **Costo aceptado:** una CLI que la pase deja de compilar en TypeScript, y en JS ve un aviso en cada corrida hasta que la saque. Es un cambio incompatible: entra en la beta.7, que reinicia la ventana de estabilidad por T-234.
- **Revisar si:** una CLI real queda colgada después de la ayuda, por algo abierto al cargar, y `cleanup` no alcanza. En ese caso vuelve, con el exit code que decide `core`.
- **Código:** `packages/help/src/plugin.ts`, `packages/help/src/types.ts`
