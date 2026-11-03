# Estado actual

> **Verificado:** 2026-11-02, con Node 26.11.1 local. CI usa Node 24.

**Resumen:** el código está sano y publicado como beta, pero Runa todavía no está listo para estable. Las tareas requeridas de las fases 1 a 4 del [backlog](./backlog.md) están cerradas, y sus cambios se publicaron en `0.2.0-beta.1` (T-401). De la fase 3 solo queda T-307, opcional. qr-plus ya migró a `0.2.0-beta.2` sin workarounds (T-402), pero esa versión no está publicada: su versión en npm sigue con commander, y migra después de la estable. `local-beacon`, cuyo agente solo ve lo publicado, adoptó Runa y MCP. Su [reporte](./research/2026-10-local-beacon-friction.md) y una [evaluación de primer uso](./research/2026-10-first-use-evaluation.md) abrieron 12 tareas requeridas. Esas 12 tareas están cerradas y publicadas en `0.2.0-beta.3`, y `local-beacon` migró y usó sus tools con un [modelo real](./research/2026-11-local-beacon-real-model.md) (T-404). El modo implícito se retiró en `0.2.0-beta.4` (T-208), que abrió la ventana de estabilidad.

## Versiones

| Paquete | `latest` | `beta` | Repo |
|---|---|---|---|
| `@runa-cmd/core` | 0.1.0 | 0.2.0-beta.4 | 0.2.0-beta.4 |
| `@runa-cmd/help` | 0.1.0 | 0.2.0-beta.4 | 0.2.0-beta.4 |
| `@runa-cmd/mcp` | 0.1.0 | 0.2.0-beta.4 | 0.2.0-beta.4 |
| `@runa-cmd/completions` | 0.1.0 | 0.2.0-beta.4 | 0.2.0-beta.4 |

Changesets está en modo pre-release con el tag `beta`.

**CI:** en verde en Ubuntu y Windows con Node 24.

## Salud técnica

| Control | Resultado |
|---|---|
| Build | Pasa |
| Typecheck | Pasa, sin incluir los tests |
| Lint (Biome) | Pasa |
| Tests | 1310 en Ubuntu: core 807, help 236, completions 122, mcp 145, con bash, zsh y fish reales |
| Aceptación con procesos reales | Pasan los 319 casos, sin fallos esperados |
| Cobertura de `core` | 91,89% de líneas, 80,45% de ramas; el mínimo exigido es 80% de líneas. No cuenta lo ejecutado en procesos hijos |
| Type tests | 11 pasan; corren con `pnpm test` y un error de tipos hace fallar la suite |

## Dónde estamos

- **Beta publicada:** `0.2.0-beta.4`, verificada desde npm en un proyecto limpio. Trae el archivo de config por comando, `testCLI()`, `format` y `--json`, un solo nombre por comando, errores por MCP sin `safeToRetry`, comandos fuera de las tools y el retiro del modo implícito.
- **Primera migración:** pasar `@qr-plus/cli` desde commander dejó cinco workarounds, ya eliminados. Es evidencia de migración, no de uso, porque esa versión no se publicó. Está en [research](./research/2026-10-qr-plus-migration.md).
- **Investigación:** el comportamiento de librerías y el uso público están en [research](./research/2026-10-cli-usage.md).
- **Problemas abiertos:** se listan en [known-issues.md](./known-issues.md). Solo queda uno, de severidad media: `npm view` no muestra el README, que se comprueba al publicar la 1.0.0 (T-506).

## Camino a v1

La 1.0 depende de que la API no necesite cambios incompatibles durante una ventana de uso real, no de una fecha ([ADR-0038](./adr/0038-ventana-de-estabilidad.md)). **La ventana abrió el 2026-11-03 a las 01:59 UTC,** al publicarse `0.2.0-beta.4`, y se completa el 2026-12-01 si no hay cambios incompatibles. Cuenta el uso de `local-beacon` sobre esa beta o una posterior, instalada desde npm. El 2026-11-03 pasó a `0.2.0-beta.4` sin cambios de código, con sus 129 pruebas, y se instaló global desde su tarball. Todavía no hay uso con un agente sobre esta beta: la máquina con Ollama estaba apagada. Un cambio incompatible la reinicia desde la beta que lo publique. Falta la documentación (T-503), y después la 1.0 y qr-plus estable.

## Decisiones abiertas

No hay decisiones abiertas.

## Cómo actualizar este archivo

Actualizalo al cerrar una tarea que cambie versiones, salud técnica o decisiones abiertas. Los números salen de ejecutar los comandos, no de copiarlos.
