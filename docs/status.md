# Estado actual

> **Verificado:** 2026-10-30, con Node 26.11.1 local. CI usa Node 24.

**Resumen:** el código está sano y publicado como beta, pero Runa todavía no está listo para estable. La fase 1 del [backlog](./backlog.md) está en curso, con T-001, T-002, T-003, T-004, T-101 y T-102 cerradas. Los cambios de T-101 y T-102 están en `main`, pendientes de la siguiente beta.

## Versiones

| Paquete | `latest` | `beta` | Repo |
|---|---|---|---|
| `@runa-cmd/core` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |
| `@runa-cmd/help` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |
| `@runa-cmd/mcp` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |
| `@runa-cmd/completions` | 0.1.0 | 0.2.0-beta.0 | 0.2.0-beta.0 |

Changesets está en modo pre-release con el tag `beta`.

## Salud técnica

| Control | Resultado |
|---|---|
| Build | Pasa |
| Typecheck | Pasa, sin incluir los tests |
| Lint (Biome) | Pasa |
| Tests | 706 pasan: core 385, help 206, completions 82, mcp 33 |
| Aceptación con procesos reales | 49 de 59 casos pasan; los otros 10 son fallos esperados, cada uno con su tarea |
| Cobertura de `core` | 95,53% de líneas, 83,97% de ramas; el mínimo exigido es 80% de líneas |
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
| [T-108](./backlog.md#t-108-resolver-metadatos-sin-efecto) | Implementar o quitar `hint`, y definir `deprecated` |
| [T-303](./backlog.md#t-303-definir-qué-corre-en-una-llamada-mcp) | Si una llamada MCP corre el mismo pipeline que la CLI |
| [T-504](./backlog.md#t-504-grupo-de-versiones-de-los-paquetes) | Si los paquetes siguen versionándose juntos |

## Cómo actualizar este archivo

Actualizalo al cerrar una tarea que cambie versiones, salud técnica o decisiones abiertas. Los números salen de ejecutar los comandos, no de copiarlos.
