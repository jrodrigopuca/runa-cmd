# Decisiones de arquitectura

Un ADR (Architecture Decision Record) registra una decisión difícil de revertir, por qué se tomó, qué cuesta y cuándo conviene revisarla.

## Reglas

- Antes de una decisión difícil de revertir, leé este índice y citá lo ya decidido.
- Un ADR aceptado no se edita. Si cambia la decisión, se crea uno nuevo con `Reemplaza: ADR-n`, y en el viejo solo cambia el estado. La excepción es una línea `Nota` que apunta a un known issue: se quita cuando el problema se resuelve.
- Un cambio de implementación que respeta la decisión no necesita ADR.
- "Revisar si" es una condición que se puede comprobar, no una fecha.
- Si `Implementación` nombra una tarea, la decisión está aceptada pero el código todavía no la refleja.
- `pnpm docs:check` exige que todo ADR figure en este índice, y al revés.

## Índice

| ADR | Decisión | Estado |
|---|---|---|
| [0001](./0001-zod-como-fuente-de-verdad.md) | Zod v4 como fuente de verdad y peer dependency | Aceptada |
| [0002](./0002-posicionales-por-orden-de-claves.md) | Posicionales por orden de claves; variádico solo al final | Aceptada |
| [0003](./0003-parseargs-extrae-zod-valida.md) | `util.parseArgs` extrae y Zod valida | Aceptada |
| [0004](./0004-sistema-de-plugins.md) | Plugins con capacidades, orden topológico y carga diferida | Aceptada |
| [0005](./0005-ayuda-como-plugin.md) | La ayuda vive solo en un plugin | Reemplazada por ADR-0021 |
| [0006](./0006-ciclo-de-vida-con-hooks.md) | Siete hooks, y cortes sin `process.exit` | Aceptada |
| [0007](./0007-middleware-onion.md) | Middleware con modelo onion | Aceptada |
| [0008](./0008-config-merge-en-core.md) | `core` hace el merge; los loaders solo leen | Aceptada |
| [0009](./0009-errores-y-codigos-de-salida.md) | Jerarquía de errores con códigos POSIX | Aceptada |
| [0010](./0010-schema-adapter.md) | `SchemaAdapter` para introspección, con selección interna | Aceptada |
| [0011](./0011-opciones-estrictas.md) | Rechazar flags desconocidas después de parsear | Aceptada |
| [0012](./0012-rest-tras-separador.md) | Lo posterior a `--` va siempre a `ctx.rest` | Reemplazada por ADR-0022 |
| [0013](./0013-coercion-numerica.md) | Un solo punto de coerción numérica, sin inventar valores | Aceptada |
| [0014](./0014-colision-de-opciones.md) | Detectar colisiones al arrancar | Aceptada |
| [0015](./0015-plataforma-y-ci.md) | ESM, Node 24+ y CI en Linux y Windows | Aceptada |
| [0016](./0016-release-con-changesets.md) | Changesets en pre-release, publicación local y grupo `fixed` | Aceptada |
| [0017](./0017-mapeo-de-comandos-a-tools-mcp.md) | Cada comando es una tool MCP | Aceptada |
| [0018](./0018-bloques-y-primitivas-de-layout.md) | `Block` es un string, y las primitivas son independientes | Aceptada |
| [0019](./0019-completions-como-comando.md) | Completions como comando, con generadores puros | Aceptada |
| [0020](./0020-un-comando-para-personas-y-agentes.md) | Un comando, para personas y agentes | Aceptada |
| [0021](./0021-help-y-version-en-core.md) | `--help` y `--version` en `core`, cediendo ante el usuario | Aceptada, pendiente de código |
| [0022](./0022-separador-llena-posicionales.md) | `--` llena posicionales; lo que sobra va a `ctx.rest` | Aceptada |
| [0023](./0023-runcli-y-modo-raiz.md) | `runCLI` con plugins y modo raíz explícito | Aceptada; falta retirar el modo implícito |
| [0024](./0024-kebab-case.md) | Kebab-case en la terminal, camelCase en el código | Aceptada, pendiente de código |
| [0025](./0025-control-de-mcp-en-el-plugin.md) | El control de tools MCP vive en el plugin | Aceptada, pendiente de código |
| [0026](./0026-docs-como-fuente-de-verdad.md) | `docs/` como fuente de verdad | Aceptada |
| [0027](./0027-toda-salida-explica-el-motivo.md) | Toda salida por error explica el motivo | Aceptada |
| [0028](./0028-coercion-booleana.md) | Los booleanos aceptan solo true, false, 1 y 0 | Aceptada |
| [0029](./0029-cada-campo-tiene-efecto.md) | Cada campo de la API tiene efecto | Aceptada |
| [0030](./0030-tools-mcp-en-subproceso.md) | Cada tool MCP corre en un subproceso de la propia CLI | Aceptada |
| [0031](./0031-quien-opera-gana-al-modelo.md) | Quien opera el servidor le gana al modelo | Aceptada |
| [0032](./0032-postura-sobre-secretos.md) | Postura sobre secretos | Aceptada |
| [0033](./0033-parar-recorre-el-arbol-de-procesos.md) | Parar recorre el árbol de procesos | Aceptada |
| [0034](./0034-sin-nada-que-correr-es-un-error-de-uso.md) | Sin nada que correr, la ayuda sale por stderr con exit 2 | Aceptada |
| [0035](./0035-listas-desde-env-y-config.md) | Una lista en env se separa por comas, y en config es un array | Aceptada |
