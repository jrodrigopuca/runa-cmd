# ADR-0027: Toda salida por error explica el motivo

- **Estado:** aceptada
- **Drivers:** `Error('')` y un `CommandError` sin mensaje salían sin decir nada. Un plugin que marcaba `ctx.handled` hacía salir con 0 un comando que había fallado, y un script lo tomaba como éxito. `process.exit` se ejecutaba antes del `finally`, así que `cleanup` no corría. Una salida tiene dos públicos: quien usa la CLI y quien la desarrolla.
- **Decisión:** el motivo se imprime antes de `cleanup`, y el proceso sale después. Un `RunaError` se muestra tal cual. Cualquier otro error nombra el comando que falló. Un error sin mensaje nunca queda vacío. `RUNA_DEBUG=1` agrega stack, código y causa. `ctx.handled` solo controla la salida por stderr: el exit code sigue siendo de falla, salvo que el plugin fije `process.exitCode = 0`.
- **Alternativas descartadas:** mostrar siempre el stack ensucia la salida de quien solo usa la CLI. Una flag `--debug` consume un nombre de opción y no sirve si la falla es previa al parseo. Un campo `ctx.exitCode` agrega API para algo que `process.exitCode` ya resuelve. Dejar que `handled` implique éxito mantiene fallas invisibles para los scripts.
- **Costo aceptado:** quien dependía de exit 0 con `handled` debe cambiarlo. `cli.run()` sigue terminando el proceso ante un error no manejado, y un `cleanup` que se cuelga deja el proceso esperando.
- **Revisar si:** quienes embeben Runa necesitan que `cli.run()` rechace la promesa en vez de terminar el proceso.
- **Código:** `packages/core/src/errors.ts`, `packages/core/src/cli.ts`, `packages/core/src/__tests__/acceptance/failure-exit.test.ts`
