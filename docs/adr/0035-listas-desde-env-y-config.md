# ADR-0035: Una lista en env se separa por comas, y en config es un array

- **Estado:** aceptada
- **Complementa:** [ADR-0003](./0003-parseargs-extrae-zod-valida.md), [ADR-0008](./0008-config-merge-en-core.md) y [ADR-0028](./0028-coercion-booleana.md)
- **Drivers:** una opción `z.array()` se repite en la terminal, pero una variable de entorno es un solo string, y hace falta una regla. Las referencias no coinciden: commander no separa, según su código; oclif tampoco, según un reporte de terceros; Click separa por espacios, según su documentación; clap separa solo si el autor declara un delimitador.
- **Decisión:** en env, el valor se separa por comas, sin espacios alrededor, y se descartan los elementos vacíos, así que un valor vacío es una lista vacía. En config, el valor es un array de JSON, y un string no se separa. En la terminal, la opción se repite, y `--tag a,b` es un solo elemento. Cada fuente reemplaza a la de menor prioridad, sin sumarse. Cada elemento se convierte según su tipo, en el mismo punto de coerción de ADR-0028.
- **Alternativas descartadas:** no separar hace que `TAGS=a,b` sea un único tag `a,b`, un error sin aviso. Separar por espacios rompe valores comunes con espacios. Un delimitador por opción agrega configuración sin un pedido real, y se puede sumar después. Aceptar JSON en env da una salida para valores con coma, a cambio de una segunda sintaxis. Sumar las fuentes haría imposible reemplazar una lista desde la terminal.
- **Costo aceptado:** un valor con coma no se puede pasar por env: hay que usar config o la terminal. La coma es criterio propio, no un estándar: se eligió por ser lo que una persona escribe en un `.env`.
- **Revisar si:** aparece un caso real de valores con coma en env, o los usuarios esperan otro separador.
- **Código:** `packages/core/src/parse/resolve.ts`, `packages/core/src/parse/parseargs-bridge.ts`
- **Evidencia:** [documentación de Click](https://click.palletsprojects.com/en/stable/options/), lectura de `lib/command.js` en commander 15.0.0, y las pruebas de `packages/core/src/__tests__/acceptance/repeated.test.ts`.
