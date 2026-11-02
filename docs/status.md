# Estado actual

> **Verificado:** 2026-10-31, con Node 26.11.1 local. CI usa Node 24.

**Resumen:** el código está sano y publicado como beta, pero Runa todavía no está listo para estable. Las tareas requeridas de las fases 1 a 4 del [backlog](./backlog.md) están cerradas, y sus cambios se publicaron en `0.2.0-beta.1` (T-401). De la fase 3 solo quedan T-307 y T-308, opcionales. qr-plus ya migró a `0.2.0-beta.2` sin workarounds (T-402), pero esa versión no está publicada: su versión en npm sigue con commander, y migra después de la estable. `local-beacon`, cuyo agente solo ve lo publicado, adoptó Runa y MCP (T-404, en curso). Su [reporte](./research/2026-10-local-beacon-friction.md) y una [evaluación de primer uso](./research/2026-10-first-use-evaluation.md) abrieron 12 tareas requeridas. El archivo de config, `testCLI()`, la salida de lo devuelto, los nombres de comandos y los errores por MCP ya están resueltos en `main`, sin publicar (T-219, T-220, T-221, T-212, T-213, T-309, T-223, T-222, T-224, T-214, T-225), y queda T-215. Después de resolverlas se retira el modo implícito (T-208).

## Versiones

| Paquete | `latest` | `beta` | Repo |
|---|---|---|---|
| `@runa-cmd/core` | 0.1.0 | 0.2.0-beta.2 | 0.2.0-beta.2 |
| `@runa-cmd/help` | 0.1.0 | 0.2.0-beta.2 | 0.2.0-beta.2 |
| `@runa-cmd/mcp` | 0.1.0 | 0.2.0-beta.2 | 0.2.0-beta.2 |
| `@runa-cmd/completions` | 0.1.0 | 0.2.0-beta.2 | 0.2.0-beta.2 |

Changesets está en modo pre-release con el tag `beta`.

**CI:** en verde en Ubuntu y Windows con Node 24.

## Salud técnica

| Control | Resultado |
|---|---|
| Build | Pasa |
| Typecheck | Pasa, sin incluir los tests |
| Lint (Biome) | Pasa |
| Tests | 1291 pasan en Ubuntu: core 794, help 236, completions 121, mcp 140, con bash, zsh y fish reales |
| Aceptación con procesos reales | Pasan los 314 casos, sin fallos esperados |
| Cobertura de `core` | 91,88% de líneas, 80,17% de ramas; el mínimo exigido es 80% de líneas. No cuenta lo ejecutado en procesos hijos |
| Type tests | 11 pasan; corren con `pnpm test` y un error de tipos hace fallar la suite |

## Dónde estamos

- **Beta publicada:** `0.2.0-beta.1` incluye `--help` sin plugins, kebab-case, opciones repetidas, y tools MCP en subprocesos con cancelación y límites.
- **Primera migración:** pasar `@qr-plus/cli` desde commander dejó cinco workarounds, ya eliminados. Es evidencia de migración, no de uso, porque esa versión no se publicó. Está en [research](./research/2026-10-qr-plus-migration.md).
- **Investigación:** el comportamiento de librerías y el uso público están en [research](./research/2026-10-cli-usage.md).
- **Problemas abiertos:** se listan en [known-issues.md](./known-issues.md). El más grave es el modo implícito de `defineCLI` (T-208).

## Camino a v1

La 1.0 depende de que la API no necesite cambios incompatibles durante una ventana de uso real, no de una fecha ([ADR-0038](./adr/0038-ventana-de-estabilidad.md)). El camino es: proyecto de MCP (T-404), una beta con las tareas requeridas de T-212 a T-225 y T-309, retiro del modo implícito (T-208), 4 semanas de uso sobre la beta publicada, 1.0, y después qr-plus estable. Esa ventana no empezó, porque todavía hay cambios incompatibles planificados.

## Decisiones abiertas

No hay decisiones abiertas.

## Cómo actualizar este archivo

Actualizalo al cerrar una tarea que cambie versiones, salud técnica o decisiones abiertas. Los números salen de ejecutar los comandos, no de copiarlos.
