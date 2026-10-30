# ADR-0022: `--` llena posicionales; lo que sobra va a `ctx.rest`

- **Estado:** aceptada
- **Reemplaza:** [ADR-0012](./0012-rest-tras-separador.md)
- **Drivers:** POSIX indica que lo posterior a `--` son operandos. Commander, citty, meow y clipanion llenan el posicional con `-- -text`; yargs y cac fallan. En una muestra amplia de commander, solo el 4% de los archivos usa pass-through.
- **Decisión:** se mantiene la división en el primer `--`, para que nada posterior se interprete como flag. Esos tokens llenan los posicionales declarados, requeridos u opcionales, en orden. Lo que sobra va a `ctx.rest`.
- **Alternativas descartadas:** llenar solo los requeridos contradice a POSIX y a commander. Una opción por comando agrega API sin un pedido real. Que lo que sobra sea un error, como en commander, perdería `ctx.rest`.
- **Costo aceptado:** `exec [target] -- ls -la` ahora pone `ls` en `target`. Es un cambio incompatible respecto de la beta.
- **Revisar si:** un wrapper real necesita un posicional opcional junto con `--`. Entonces se agrega una opción por comando.
- **Implementación:** [T-202](../backlog.md#t-202----llena-posicionales)
