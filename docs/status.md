# Estado actual

> **Verificado:** 2026-10-31, con Node 26.11.1 local. CI usa Node 24.

**Resumen:** el código está sano y publicado como beta, pero Runa todavía no está listo para estable. Las tareas requeridas de las fases 1 a 4 del [backlog](./backlog.md) están cerradas, y sus cambios se publicaron en `0.2.0-beta.1` (T-401). De la fase 3 solo quedan T-307 y T-308, opcionales. La revalidación de qr-plus (T-402) borró casi todos sus workarounds y sumó T-209, T-210 y T-404.

## Versiones

| Paquete | `latest` | `beta` | Repo |
|---|---|---|---|
| `@runa-cmd/core` | 0.1.0 | 0.2.0-beta.1 | 0.2.0-beta.1 |
| `@runa-cmd/help` | 0.1.0 | 0.2.0-beta.1 | 0.2.0-beta.1 |
| `@runa-cmd/mcp` | 0.1.0 | 0.2.0-beta.1 | 0.2.0-beta.1 |
| `@runa-cmd/completions` | 0.1.0 | 0.2.0-beta.1 | 0.2.0-beta.1 |

Changesets está en modo pre-release con el tag `beta`.

**CI:** en verde en Ubuntu y Windows con Node 24.

## Salud técnica

| Control | Resultado |
|---|---|
| Build | Pasa |
| Typecheck | Pasa, sin incluir los tests |
| Lint (Biome) | Pasa |
| Tests | 1067 pasan: core 624, help 217, completions 97, mcp 129 |
| Aceptación con procesos reales | Pasan los 190 casos, sin fallos esperados |
| Cobertura de `core` | 91,93% de líneas, 79,79% de ramas; el mínimo exigido es 80% de líneas. No cuenta lo ejecutado en procesos hijos |
| Type tests | 11 pasan; corren con `pnpm test` y un error de tipos hace fallar la suite |

## Dónde estamos

- **Beta publicada:** `0.2.0-beta.1` incluye `--help` sin plugins, kebab-case, opciones repetidas, y tools MCP en subprocesos con cancelación y límites.
- **Primer uso real:** la migración de `@qr-plus/cli` desde commander dejó cinco workarounds. Está en [research](./research/2026-10-qr-plus-migration.md).
- **Investigación:** el comportamiento de librerías y el uso público están en [research](./research/2026-10-cli-usage.md).
- **Problemas abiertos:** se listan en [known-issues.md](./known-issues.md). Quedan el modo implícito de `defineCLI` (T-208), que se retira después de T-402, y `completions` como tool (T-308).

## Camino a v1

La 1.0 depende de que la API no necesite cambios incompatibles durante una ventana de uso real, no de una fecha ([T-501](./backlog.md#t-501-criterio-de-estabilidad-verificable)). Esa ventana no empezó, porque todavía hay cambios incompatibles planificados.

## Decisiones abiertas

| Tarea | Pregunta |
|---|---|
| [T-504](./backlog.md#t-504-grupo-de-versiones-de-los-paquetes) | Si los paquetes siguen versionándose juntos |

## Cómo actualizar este archivo

Actualizalo al cerrar una tarea que cambie versiones, salud técnica o decisiones abiertas. Los números salen de ejecutar los comandos, no de copiarlos.
