# ADR-0031: Quien opera el servidor le gana al modelo

- **Estado:** aceptada
- **Complementa:** [ADR-0008](./0008-config-merge-en-core.md), [ADR-0025](./0025-control-de-mcp-en-el-plugin.md) y [ADR-0030](./0030-tools-mcp-en-subproceso.md)
- **Drivers:** en la CLI, una flag le gana a env porque la misma persona pone ambas. Con una tool, quien configura el servidor y quien la llama son distintos: un modelo no debería pasar de `staging` a `production`, ni ver un token. MCP indica tomar las credenciales del entorno en stdio.
- **Decisión:** una opción con valor de env o config sale del schema de la tool, y si el modelo la envía igual, se descarta. `mcpPlugin({ tools: { deploy: { expose, serverOnly } } })` ajusta esto por tool: `expose` la deja en manos del modelo, y `serverOnly` exige un valor para arrancar. Los valores fijos de 8 caracteres o más, incluidas las globales de arranque, se redactan del stdout y el stderr devueltos al modelo. Lo que `run()` devuelve no se altera.
- **Alternativas descartadas:** que el agente cuente como una flag y pise env le da al modelo lo que el operador fijó. Redactar valores cortos rompería texto común: `REGION=us` tocaría cualquier "us". Redactar el valor devuelto rompería URLs legítimas y el `output` declarado.
- **Costo aceptado:** un secreto de menos de 8 caracteres no se redacta. Un comando que devuelve un secreto lo expone, porque es decisión del autor. Un valor fijo no secreto, como `production-eu`, también se redacta de los logs. La redacción es por coincidencia exacta, así que no detecta un valor transformado, como un token en base64.
- **Revisar si:** hace falta marcar secretos de forma explícita, o la redacción oculta información útil con frecuencia.
- **Código:** `packages/mcp/src/operator.ts`
