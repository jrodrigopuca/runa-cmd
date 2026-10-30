# ADR-0028: Los booleanos aceptan solo true, false, 1 y 0

- **Estado:** aceptada
- **Complementa:** [ADR-0003](./0003-parseargs-extrae-zod-valida.md), [ADR-0008](./0008-config-merge-en-core.md) y [ADR-0013](./0013-coercion-numerica.md)
- **Drivers:** las variables de entorno siempre son strings, así que `MINIFY=true` fallaba o se ignoraba. Un booleano con default ignoraba env y config sin avisar, porque el default llegaba a `parseArgs` y contaba como argumento de CLI. `--minify=false` también llega como string.
- **Decisión:** los defaults de schema nunca pasan por `parseArgs`: los aplica Zod al final, como en cualquier otro tipo. Las tres fuentes usan el mismo punto de coerción. Se aceptan `true`, `1`, `false` y `0`, sin distinguir mayúsculas. Cualquier otro valor, incluido el vacío, se rechaza con exit 2.
- **Alternativas descartadas:** aceptar también `yes`, `no`, `on` y `off` amplía el contrato sin un pedido real. Tratar cualquier texto no vacío como verdadero haría que `MINIFY=false` activara la opción. Interpretar un vacío como falso inventaría un valor, igual que `Number('')`.
- **Costo aceptado:** `MINIFY=yes` y `MINIFY=` dan error. El mensaje nombra la flag, aunque el valor haya venido de una variable de entorno.
- **Revisar si:** usuarios reales piden `yes` y `no`, o el mensaje confunde a quien configuró el valor por env.
- **Código:** `packages/core/src/parse/resolve.ts`, `packages/core/src/parse/parseargs-bridge.ts`, `packages/core/src/__tests__/acceptance/boolean-values.test.ts`
