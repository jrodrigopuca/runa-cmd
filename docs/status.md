# Estado actual

> **Verificado:** 2026-10-30, con Node 26.11.1 local. CI usa Node 24.

**Resumen:** el código está sano y publicado como beta, pero Runa todavía no está listo para estable. Las fases 1 y 2 del [backlog](./backlog.md) están cerradas, y sus cambios están en `main`, pendientes de la siguiente beta. En la fase 3, las tools corren en un subproceso de la propia CLI (T-303), quien opera le gana al modelo (T-306), y sigue T-304.

## Versiones

| Paquete | `latest` | `beta` | Repo |
|---|---|---|---|
| `@runa-cmd/core` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |
| `@runa-cmd/help` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |
| `@runa-cmd/mcp` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |
| `@runa-cmd/completions` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |

Changesets está en modo pre-release con el tag `beta`.

**CI:** en verde en Ubuntu y Windows con Node 24. El [PR de versiones](https://github.com/jrodrigopuca/runa-cmd/pull/1) queda abierto hasta T-401: mergearlo fijaría `0.2.0-beta.1`.

## Salud técnica

| Control | Resultado |
|---|---|
| Build | Pasa |
| Typecheck | Pasa, sin incluir los tests |
| Lint (Biome) | Pasa |
| Tests | 896 pasan: core 511, help 211, completions 88, mcp 86 |
| Aceptación con procesos reales | 107 de 112 casos pasan; los otros 5 son fallos esperados, cada uno con su tarea |
| Cobertura de `core` | 94,65% de líneas, 84,65% de ramas; el mínimo exigido es 80% de líneas. No cuenta lo ejecutado en procesos hijos |
| Type tests | 11 pasan; corren con `pnpm test` y un error de tipos hace fallar la suite |

## Dónde estamos

- **Beta publicada:** corrigió flags desconocidas, cobertura, CI en Linux y Windows, y aisló Zod detrás de un adapter.
- **Primer uso real:** la migración de `@qr-plus/cli` desde commander dejó cinco workarounds. Está en [research](./research/2026-10-qr-plus-migration.md).
- **Investigación:** el comportamiento de librerías y el uso público están en [research](./research/2026-10-cli-usage.md).
- **Problemas abiertos:** se listan en [known-issues.md](./known-issues.md). Los más graves son que MCP pierde la salida de los comandos, y que `z.array()` como opción falla siempre.

## Camino a v1

La 1.0 depende de que la API no necesite cambios incompatibles durante una ventana de uso real, no de una fecha ([T-501](./backlog.md#t-501-criterio-de-estabilidad-verificable)). Esa ventana no empezó, porque todavía hay cambios incompatibles planificados.

## Decisiones abiertas

| Tarea | Pregunta |
|---|---|
| [T-504](./backlog.md#t-504-grupo-de-versiones-de-los-paquetes) | Si los paquetes siguen versionándose juntos |

## Cómo actualizar este archivo

Actualizalo al cerrar una tarea que cambie versiones, salud técnica o decisiones abiertas. Los números salen de ejecutar los comandos, no de copiarlos.
