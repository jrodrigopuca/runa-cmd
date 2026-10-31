# Capturar la salida de `testCLI()` con `AsyncLocalStorage`

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿puede `testCLI()` admitir ejecuciones concurrentes dentro de un proceso? Es la hipótesis abierta de [ADR-0041](../adr/0041-funcion-de-pruebas.md).

**Respuesta:** sí. Dirigir la salida por contexto asíncrono separó bien 200 ejecuciones intercaladas, sin perder resultados de `node --test` ni de Vitest. Hacen falta tres ajustes dentro de `core`, y `process.env` sigue sin aislarse.

## Método

Se probó un prototipo de unas 60 líneas, fuera del repo, sobre el `dist` real de `@runa-cmd/core`. Los comandos imprimen en pasos, con esperas al azar, para que se intercalen. Se usó Node 26.11.1 y Vitest 4.1.10, en macOS.

## Resultado

| Prueba | Resultado |
|---|---|
| 200 ejecuciones en paralelo, sin runner | Las 200 con solo su salida, en stdout y stderr |
| Control: reemplazar la salida por ejecución, 30 en paralelo | 6 con líneas ajenas, y las 30 con líneas de menos |
| 50 fallos con `CommandError` | 50 con exit 3 y su texto; `cleanup` corrió en las 50 |
| `node --test`, 30 en paralelo y 1 fallo adrede | 5 corridas iguales: 30 pasan, y el fallo se reporta |
| Vitest, `describe.concurrent`, 31 casos | 5 corridas: 31 pasan |

## Qué hace falta en `core`

1. **Señales.** Cada ejecución registra sus listeners en `process`: hubo 200 a la vez, y desde el 11 Node emite `MaxListenersExceededWarning`, que cayó dentro de la salida capturada de una prueba. El prototipo lo evitó con `setMaxListeners(0)`, que oculta el problema. `testCLI()` no debería registrar señales por ejecución.
2. **`console`.** Vitest lo reemplaza, así que un `console.log` nunca llega a `process.stdout`: la primera corrida falló en los 31 casos. Hay que dirigir también los métodos de `console`.
3. **`process.exit` dentro de un comando.** La excepción que lo simula la atrapa el ciclo de vida, y sale `Unexpected error` con exit 1, en vez de 7. El ciclo de vida tiene que reconocerla.

## Límites

- `process.env` y el directorio actual siguen siendo globales. `core` puede recibir el entorno por parámetro, pero un comando que lea `process.env` por su cuenta ve el real.
- Un subproceso, o una escritura directa a un descriptor, no pasa por este camino.
- Con `process.exit` real no corre `cleanup`, y dentro de `testCLI()` sí corrió en las 50: hay una diferencia con una ejecución real, y hay que decidirla.
- No se probó en Windows ni en Linux.
