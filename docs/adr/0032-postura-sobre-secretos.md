# ADR-0032: Postura sobre secretos

- **Estado:** aceptada
- **Amplía:** [ADR-0031](./0031-quien-opera-gana-al-modelo.md)
- **Drivers:** commander, yargs, citty, cac y clipanion no tienen ningún concepto de secreto, y oclif, clap y Click solo cubren ayuda o prompts. Una CLI no lo necesita porque quien la corre es dueño del secreto. El problema aparece con MCP, donde el modelo es un lector no confiable. Con ADR-0031, si faltaba `API_TOKEN`, el modelo veía `token` como parámetro y podía pedírselo a una persona. La especificación de MCP indica tomar las credenciales del entorno en stdio.
- **Decisión:** una opción que declara `env` es de quien opera: nunca entra en el schema de la tool, tenga o no valor, salvo con `expose`. Si le falta el valor, la llamada falla con el error normal de la CLI. La redacción de ADR-0031 sigue como red de seguridad, no como barrera. Runa no tiene un concepto de "secreto" en su API.
- **Qué garantiza Runa:** lo que declara `env` o tiene valor de config no llega al schema. El modelo no puede cambiar lo que fijó quien opera. Stdout y stderr pasan por redacción exacta de valores fijos.
- **Qué no garantiza:** que un comando no filtre un secreto por su cuenta, detectar valores transformados como base64, ni proteger lo que `run()` devuelve. La frontera real es no exponer lo que un agente no debería correr ([T-302](../backlog.md#t-302-excluir-y-anotar-tools)).
- **Alternativas descartadas:** `secret: true` en `meta.options` agrega un concepto a `core` para un problema de MCP, sin un caso real. Un tipo como `SecretStr` de Pydantic protege desde el origen, pero cambia cómo se leen las opciones. Detectar por nombre, como `token`, sería una heurística sobre datos ajenos. Ambas opciones explícitas se pueden sumar después sin romper nada.
- **Costo aceptado:** una opción con `env` que el modelo sí debe elegir, como `--env` en un `deploy`, necesita `expose`. [clig.dev](https://clig.dev/) desaconseja leer secretos de variables de entorno: en un servidor MCP seguimos a la especificación de MCP.
- **Revisar si:** un caso real muestra un secreto que esta regla no cubre, como uno devuelto por `run()`, o los autores repiten `expose` en la mayoría de sus opciones.
- **Código:** `packages/mcp/src/operator.ts`
- **Evidencia:** [secretos en CLIs](../research/2026-10-secrets-in-clis.md)
