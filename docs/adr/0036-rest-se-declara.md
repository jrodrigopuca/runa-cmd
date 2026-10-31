# ADR-0036: `--` llena posicionales, y lo que sobra es un error si el comando no pidió `rest`

- **Estado:** aceptada
- **Reemplaza:** [ADR-0022](./0022-separador-llena-posicionales.md)
- **Drivers:** en la revalidación de qr-plus, `qr-plus a -- b` generaba el QR de `a` y descartaba `b` con exit 0, porque nada avisa si un comando ignora `ctx.rest`. qr-plus necesitó 5 líneas propias para evitarlo, y su error no era igual a los demás. ADR-0022 había descartado una opción por comando por falta de un pedido real, y este lo es. En una muestra amplia de commander, solo el 4% de los archivos usa pass-through, así que lo común es no querer `rest`.
- **Decisión:** se mantiene la división en el primer `--`, y esos tokens llenan los posicionales declarados, en orden. Lo que sobra va a `ctx.rest` solo si el comando declara `rest: true`. Si no, es el error de siempre: `Unexpected positional argument`, exit 2.
- **Alternativas descartadas:** dejar `rest` siempre disponible pierde datos en silencio en el caso común, y cada CLI tiene que escribir su propia validación. Detectar si `run()` leyó `ctx.rest` llega tarde, porque el comando ya corrió. Un `ctx.rest` opcional obliga a escribir `?? []`: sigue siendo un array, vacío sin la declaración.
- **Costo aceptado:** un comando que envuelve a otro tiene que declarar `rest: true`. Es un cambio incompatible, y hay que hacerlo antes de abrir la ventana de estabilidad.
- **Revisar si:** los autores de wrappers olvidan declararlo y el error les resulta confuso.
- **Código:** `packages/core/src/cli.ts`, `packages/core/src/parse/resolve.ts`
- **Evidencia:** [revalidación de qr-plus](../research/2026-10-qr-plus-revalidation.md)
- **Implementación:** [T-209](../backlog.md#t-209-lo-que-sobra-después-de----no-se-pierde)
