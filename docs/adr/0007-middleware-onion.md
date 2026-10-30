# ADR-0007: Middleware con modelo onion

- **Estado:** aceptada
- **Drivers:** resolver temas transversales, como tiempos o autenticación, envolviendo la ejecución del comando.
- **Decisión:** el middleware siempre es async y sigue el modelo de Koa y Hono: el código antes de `next()` corre antes del comando, y el de después, al volver. El primero de la lista es el más externo. Los comandos pueden ser síncronos o async.
- **Alternativas descartadas:** usar solo hooks no permite envolver la ejecución.
- **Costo aceptado:** conviven dos mecanismos, hooks y middleware, y hay que explicar cuándo usar cada uno.
- **Revisar si:** los middlewares reales no necesitan código después de `next()`.
- **Código:** `packages/core/src/middleware.ts`, `packages/core/src/cli.ts`
