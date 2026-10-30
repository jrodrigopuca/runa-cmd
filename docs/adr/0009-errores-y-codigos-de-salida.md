# ADR-0009: Jerarquía de errores con códigos POSIX

- **Estado:** aceptada
- **Drivers:** los scripts deben distinguir un error de uso de un fallo del comando. Los hooks necesitan errores tipados.
- **Decisión:** `RunaError` es la base, con `code` y `exitCode`. De ella salen `ValidationError` (exit 2), `CommandNotFoundError` (exit 127) y `CommandError` (configurable, 1 por defecto). Si `onError` o `cleanup` fallan, el fallo se registra en stderr y no se relanza: el error original decide la salida.
- **Alternativas descartadas:** una sola clase con un campo `type` pierde `instanceof`. Una jerarquía más profunda es excesiva. Relanzar desde `onError` pondría en riesgo `cleanup`.
- **Costo aceptado:** los errores de autor, como colisiones, usan `RunaError` con exit 1 en lugar de una clase propia.
- **Revisar si:** los consumidores necesitan distinguir errores de autor por tipo y no por `code`.
- **Código:** `packages/core/src/errors.ts`, `packages/core/src/cli.ts`, `packages/core/src/lifecycle.ts`
