# Estado actual

> **Verificado:** 2026-11-08, con Node 26.11.1 local. CI usa Node 24. Herramientas: TypeScript 7.0.2, vitest 5.1.0 con vite 8.3.5, Biome 2.6.4, Zod 4.6.7 en desarrollo y Changesets 2.31.1, que pasa a la 3.x en T-506. `@types/node` sigue la versión mínima de Node que se soporta, 24, y no la última: así el typecheck falla si el código usa algo que Node 24 no tiene.

**Resumen:** el código está sano y publicado como beta, pero Runa todavía no está listo para estable. Las tareas requeridas de las fases 1 a 4 del [backlog](./backlog.md) están cerradas, y sus cambios se publicaron en `0.2.0-beta.1` (T-401). De la fase 3 solo queda T-307, opcional. qr-plus ya migró a `0.2.0-beta.2` sin workarounds (T-402), pero esa versión no está publicada: su versión en npm sigue con commander, y migra después de la estable. `local-beacon`, cuyo agente solo ve lo publicado, adoptó Runa y MCP. Su [reporte](./research/2026-10-local-beacon-friction.md) y una [evaluación de primer uso](./research/2026-10-first-use-evaluation.md) abrieron 12 tareas requeridas. Esas 12 tareas están cerradas y publicadas en `0.2.0-beta.3`, y `local-beacon` migró y usó sus tools con un [modelo real](./research/2026-11-local-beacon-real-model.md) (T-404). El modo implícito se retiró en `0.2.0-beta.4` (T-208), que abrió la ventana de estabilidad.

## Versiones

| Paquete | `latest` | `beta` | Repo |
|---|---|---|---|
| `@runa-cmd/core` | 0.1.0 | 0.2.0-beta.6 | 0.2.0-beta.6 |
| `@runa-cmd/help` | 0.1.0 | 0.2.0-beta.6 | 0.2.0-beta.6 |
| `@runa-cmd/mcp` | 0.1.0 | 0.2.0-beta.6 | 0.2.0-beta.6 |
| `@runa-cmd/completions` | 0.1.0 | 0.2.0-beta.6 | 0.2.0-beta.6 |
| `@runa-cmd/create` | 0.2.0-beta.5 | 0.2.0-beta.6 | 0.2.0-beta.6 |

`@runa-cmd/create` tiene `latest` en una beta porque npm se lo puso a su primera publicación, y Changesets solo mueve `beta`. Hasta la 1.0 se mueve a mano en cada publicación, como dice CONTRIBUTING, para que `npm create @runa-cmd my-tool` sin `@beta` genere la última.

Changesets está en modo pre-release con el tag `beta`.

**CI:** en verde en Ubuntu y Windows con Node 24.

## Salud técnica

| Control | Resultado |
|---|---|
| Build | Pasa |
| Typecheck | Pasa, sin incluir los tests |
| Lint (Biome) | Pasa |
| Tests | 1337 en Ubuntu: core 816, help 237, completions 122, mcp 145, create 17, con bash, zsh y fish reales |
| Aceptación con procesos reales | Pasan los 319 casos, sin fallos esperados |
| Cobertura de `core` | 91,89% de líneas, 80,45% de ramas; el mínimo exigido es 80% de líneas. No cuenta lo ejecutado en procesos hijos |
| Type tests | 11 pasan; corren con `pnpm test` y un error de tipos hace fallar la suite |

## Dónde estamos

- **Beta publicada:** `0.2.0-beta.6`, el 2026-11-08, verificada desde npm: un servicio que termina bien tras `SIGTERM` o `SIGINT` muere por la señal, sin `Interrupted.`, y la shell ve 143 y 130; uno que ignora la señal sigue diciendo `Interrupted.`. El generador crea un proyecto con la beta.6 que instala, pasa sus tests y compila. La `0.2.0-beta.5`, del mismo día, también verificada desde npm en una carpeta limpia: `npm create @runa-cmd@beta` genera un proyecto que instala, pasa sus tests, compila y corre, con `--version` igual al `package.json`. Trae `@runa-cmd/create`, `command.path` en hooks y middleware, `defaultDescription`, el error que nombra la variable de entorno y el SDK de MCP 1.32. Es aditiva, así que no reinicia la ventana de estabilidad. La `0.2.0-beta.4` trajo el archivo de config por comando, `testCLI()`, `format` y `--json`, un solo nombre por comando, errores por MCP sin `safeToRetry`, comandos fuera de las tools y el retiro del modo implícito.
- **Primera migración:** pasar `@qr-plus/cli` desde commander dejó cinco workarounds, ya eliminados. Es evidencia de migración, no de uso, porque esa versión no se publicó. Está en [research](./research/2026-10-qr-plus-migration.md).
- **Investigación:** el comportamiento de librerías y el uso público están en [research](./research/2026-10-cli-usage.md).
- **Problemas abiertos:** se listan en [known-issues.md](./known-issues.md). Solo queda uno, de severidad media: `npm view` no muestra el README, que se comprueba al publicar la 1.0.0 (T-506).

## Camino a v1

La 1.0 depende de que la API no necesite cambios incompatibles durante una ventana de uso real, no de una fecha ([ADR-0038](./adr/0038-ventana-de-estabilidad.md)). **La ventana se reinició el 2026-11-08 a las 17:15 UTC,** al publicarse `0.2.0-beta.6`, y se completa el 2026-12-06 si no hay cambios incompatibles. Había abierto el 2026-11-03 a las 01:59 UTC con `0.2.0-beta.4`. Cuenta el uso de `local-beacon` sobre esa beta o una posterior, instalada desde npm. El 2026-11-03 pasó a `0.2.0-beta.4` sin cambios de código, con sus 129 pruebas, y se instaló global desde su tarball. El 2026-11-08 pasó a `0.2.0-beta.5` igual, sin cambios de código, y la usó en su trabajo normal: `lbeacon proxy` reenvió los 18 pedidos de una tanda de un runner de agentes sin errores, y por MCP un modelo real usó sus tools sin reintentar ([validación](./research/2026-11-local-beacon-beta5.md)). Mientras la usaba agregó opciones a sus comandos, y Runa no frenó nada. `0.2.0-beta.6` cambia cómo termina una parada ([ADR-0046](./adr/0046-una-parada-termina-por-la-senal.md)). Primero se decidió que no reiniciaba la ventana, porque la shell ve el mismo 130 o 143 y no se conocía nadie que leyera `code` desde `spawn`. Pero `local-beacon` sí lo leía: dos tests y un script esperaban `code === 130`, y tuvo que cambiar código al actualizar. Con eso es un cambio incompatible según ADR-0038, y el mantenedor reinició la ventana desde la beta.6. Primer uso real dentro de la ventana nueva, el mismo día: 9 corridas de un agente con `qwen3.5:9b` pasando por `lbeacon proxy`, unos 4 minutos y 42 pedidos de generación, con `watch`, `status` y `requests` mientras corría. Todos terminaron sin errores, Ctrl+C cortó bien y no hubo fricción con Runa. Que `testCLI()` falle cuando recibe `config` para una CLI que no lee archivo (T-230) **no reinicia la ventana**, por decisión del mantenedor del 2026-11-08: cambia una prueba que ya estaba mal en un error con mensaje, y ningún usuario conocido le pasa `config`. Por lo mismo tampoco la reinicia que un middleware sin `next()` o sin `await` falle (T-231), decidido el mismo día: ningún usuario conocido usa middleware, y por MCP ese caso pasa de `class: 'not_run'` a `'rejected'`, con el mismo `effect`. Un cambio incompatible la reinicia desde la beta que lo publique. La documentación de v1 (T-503) quedó hecha el 2026-11-08: seis guías con sus ejemplos en CI, y todos los símbolos públicos con JSDoc; la referencia generada es opcional (T-507). Falta la Fase 7 del backlog, 13 tareas requeridas que salieron de [la revisión de coherencia y la comparación](./research/2026-11-review-before-v1.md) del 2026-11-08: correcciones y decisiones de contrato que conviene cerrar antes de la 1.0, porque después costarían una major. Casi todas son aditivas. La excepción es T-234, que renombra tres códigos de error: el mantenedor decidió el 2026-11-08 que **la ventana se reinicia desde `0.2.0-beta.7`**, la beta que publique ese cambio. Después, que la ventana se complete sin cambios incompatibles, la 1.0 (T-506) y qr-plus estable.

## Decisiones abiertas

No hay decisiones abiertas.

## Cómo actualizar este archivo

Actualizalo al cerrar una tarea que cambie versiones, salud técnica o decisiones abiertas. Los números salen de ejecutar los comandos, no de copiarlos.
