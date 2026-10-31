# ADR-0034: Sin nada que correr, la ayuda sale por stderr con exit 2

- **Estado:** aceptada
- **Amplía:** [ADR-0009](./0009-errores-y-codigos-de-salida.md) y [ADR-0021](./0021-help-y-version-en-core.md)
- **Drivers:** `tool` sin argumentos, en un CLI multi-comando, y `tool db`, en un grupo, daban 127. [clig.dev](https://clig.dev/) pide mostrar ayuda en ese caso, pero no define stream ni exit code. La práctica está dividida: commander imprime por stderr y sale con 1, y `git` y `npm` salen con 1, mientras `cargo` y `gh` salen con 0. Un script con una variable vacía, `tool $CMD`, no debería pasar como éxito, y un agente necesita saber que no se ejecutó nada.
- **Decisión:** cuando argv se termina antes de llegar a un comando, Runa muestra la ayuda de ese punto por stderr y sale con 2, el código de los errores de uso. `--help` pedido a propósito sigue por stdout con 0. Un nombre que no existe sigue siendo 127, con su sugerencia. Con `replaceHelp`, el plugin recibe el stream donde escribir.
- **Alternativas descartadas:** exit 0, como `cargo` y `gh`, hace pasar por bueno un script roto. Exit 1, como commander, lo confunde con un fallo del comando, cuando ADR-0009 ya reserva el 2 para el uso. Stdout mezcla la ayuda con la salida de un comando en un pipe.
- **Costo aceptado:** quien migre desde commander y compare contra 1 ve un 2, aunque ambos son distintos de 0. La firma de `replaceHelp` recibe un segundo parámetro.
- **Revisar si:** una CLI real necesita correr algo por defecto sin argumentos. Hoy eso es `runCLI`, con su comando raíz.
- **Código:** `packages/core/src/cli.ts`, `packages/core/src/help.ts`
- **Evidencia:** lectura de `lib/command.js` en commander 15.0.0, y ejecución de `git`, `npm`, `cargo` y `gh` sin argumentos, en macOS.
