# ADR-0021: `--help` y `--version` en `core`, cediendo ante el usuario

- **Estado:** aceptada
- **Reemplaza:** [ADR-0005](./0005-ayuda-como-plugin.md)
- **Drivers:** las 5 librerías donde la prueba es válida ofrecen `--help` sin un paquete extra. El 78% de los archivos de entrada con commander declara versión. GNU pide ambas flags. En qr-plus, `--help` fue la primera fricción.
- **Decisión:** `core` incluye `--help`, `-h` y un renderer básico sin dependencias de runtime. `helpPlugin` lo reemplaza mediante un slot nuevo para temas y renderers propios. `--version` existe solo si hay `meta.version`, sin alias corto. Si el usuario declara esas flags o `-h`, gana el usuario y la CLI arranca.
- **Alternativas descartadas:** que `core` dependa de `help` invierte la dirección de dependencias. Un preset o metapaquete agrega otra pieza. Mantener todo en el plugin deja el primer comando roto. Alias `-V`: solo commander lo usa, y `-v` es ambiguo.
- **Costo aceptado:** `core` crece, estimado en unas 100 líneas, y hay dos renderers que mantener alineados.
- **Revisar si:** alinear los renderers cuesta más que el beneficio de no instalar `@runa-cmd/help`.
- **Implementación:** [T-201](../backlog.md#t-201---version-integrado), [T-204](../backlog.md#t-204---help-en-core-reemplazable), [T-205](../backlog.md#t-205-ruteo-único-para-la-ayuda)
