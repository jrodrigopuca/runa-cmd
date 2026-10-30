# ADR-0018: `Block` es un string, y las primitivas son independientes

- **Estado:** aceptada
- **Drivers:** componer salida de terminal de forma simple, con detección de color y sin dependencias, también fuera de la ayuda.
- **Decisión:** `Block` es un string con ANSI. `styled`, `box`, `join`, `table`, `list` y `columns` se exportan sin depender del plugin. El color se degrada solo: truecolor, 256, 16 o nada. El contexto se detecta una vez y cada primitiva acepta uno explícito para tests. La ayuda se personaliza en tres capas: sin configuración, tema y `render` propio.
- **Alternativas descartadas:** un objeto con líneas y ancho complica toda la composición. Una librería de word-wrap agrega una dependencia evitable.
- **Costo aceptado:** el ancho visible no contempla CJK ni emoji ([T-602](../backlog.md#t-602-ancho-correcto-para-cjk-y-emoji)).
- **Revisar si:** las tablas con caracteres anchos se vuelven un problema frecuente.
- **Código:** `packages/help/src/primitives/styled.ts`, `packages/help/src/ansi/detect.ts`, `packages/help/src/theme.ts`
