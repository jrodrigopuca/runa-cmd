# ADR-0024: Kebab-case en la terminal, camelCase en el código

- **Estado:** aceptada
- **Drivers:** el 92% de las flags de varias palabras en commander usa kebab-case (618 de 672). `--${name}` está repetido en 19 literales de 7 archivos, sin contar fish, así que falta un concepto de nombre de flag.
- **Decisión:** `darkColor` se expone como `--dark-color` y sigue siendo `options.darkColor`. El schema gana un campo con el nombre de la flag, que usan ayuda, errores y completions. Las claves de MCP y config no cambian. Una clave ya escrita con guiones se respeta. Solo se acepta la forma kebab, y `--darkColor` sugiere la correcta. Un booleano `noX` falla al arrancar.
- **Alternativas descartadas:** aceptar ambas formas, como yargs y citty, deja dos sintaxis para siempre. No hacer nada mantiene el workaround de qr-plus. Mapear `noX` en silencio confunde con la negación automática.
- **Costo aceptado:** rompe `--darkColor` en la beta.
- **Revisar si:** aparecen usuarios beta con scripts en camelCase.
- **Implementación:** [T-206](../backlog.md#t-206-kebab-case-por-defecto)
