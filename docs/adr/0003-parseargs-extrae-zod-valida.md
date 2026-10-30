# ADR-0003: `util.parseArgs` extrae y Zod valida

- **Estado:** aceptada
- **Drivers:** cero dependencias de runtime en `core`. `parseArgs` ya resuelve `--clave=valor`, negación y separación de tokens.
- **Decisión:** `parseArgs` solo entrega strings y booleanos, y Zod hace la validación. `parseargs-bridge.ts` traduce el schema a la configuración de `parseArgs`. La única coerción previa a Zod es la numérica ([ADR-0013](./0013-coercion-numerica.md)). `strict` queda en `false`, porque el control de flags desconocidas está en [ADR-0011](./0011-opciones-estrictas.md).
- **Alternativas descartadas:** un parser propio reinventa la solución y agrega riesgo. `minimist` o `yargs-parser` rompen el objetivo de cero dependencias. Usar solo `type: 'string'` pierde `--no-*`.
- **Costo aceptado:** Runa hereda las rarezas de `parseArgs`. Un test fija el comportamiento de la negación, porque CI corre una sola línea de Node.
- **Revisar si:** `parseArgs` cambia de comportamiento, o un requisito no se puede cubrir sin reescribir la tokenización.
- **Código:** `packages/core/src/parse/parseargs-bridge.ts`, `packages/core/src/__tests__/parse/parseargs-negation.test.ts`
