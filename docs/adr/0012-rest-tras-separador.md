# ADR-0012: Lo posterior a `--` va siempre a `ctx.rest`

- **Estado:** reemplazada por [ADR-0022](./0022-separador-llena-posicionales.md)
- **Drivers:** `mycli exec -- --help` mostraba ayuda porque el extractor de globales no respetaba `--`.
- **Decisión:** dividir argv en el primer `--` antes de procesar opciones. Lo posterior llega sin validar a `ctx.rest`, que siempre es un array.
- **Alternativas descartadas:** dejarlo en `positionals` de `parseArgs`. Un `rest` opcional obliga a escribir `?? []`.
- **Costo aceptado:** `tool -- -text` no llena un posicional requerido.
- **Revisar si:** ese costo aparece en uso real. Sucedió en la migración de qr-plus.
- **Código:** `packages/core/src/cli.ts`
