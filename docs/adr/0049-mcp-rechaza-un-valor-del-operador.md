# ADR-0049: Un valor que el modelo manda para una opción del operador se rechaza

- **Estado:** aceptada
- **Modifica:** [ADR-0031](./0031-quien-opera-gana-al-modelo.md), que lo descartaba
- **Drivers:** una opción que declara `env`, o que tiene valor en el config, sale del schema de la tool, y si el modelo la mandaba igual se descartaba en silencio: el comando corría con el valor del operador y la llamada respondía éxito. Verificado en la [segunda revisión](../research/2026-11-second-review-before-v1.md): el modelo manda `replicas: 5` y recibe éxito con `replicas 2`, y le va a decir a la persona que hizo lo que pidió. Una clave que no existe, en cambio, ya daba error (`Unknown input`).
- **Decisión:** una llamada que manda una opción que fijó el operador falla con `class: invalid_input`, `effect: none`, y el texto `'replicas' is set by the operator of this server, so it can't be sent.` El comando no corre. El texto no muestra el valor del operador, que puede ser un secreto. Lo demás de ADR-0031 sigue igual: el operador le gana al modelo, y `expose` deja una opción en manos del modelo.
- **Alternativas descartadas:** correr igual y avisarlo en la respuesta deja que corra un comando con un valor que el modelo no pidió, que es lo peligroso en uno destructivo, y un modelo puede no leer el aviso. Dejarlo como estaba sigue respondiendo algo falso.
- **Costo aceptado:** un cliente que hoy manda esa clave y espera éxito recibe un error. Es poco probable, porque la clave no está en su schema. Es incompatible y entra en la `0.2.0-beta.7`.
- **Revisar si:** un cliente real necesita mandar el schema completo sin saber qué fijó el operador.
- **Código:** `packages/mcp/src/server.ts`
- **Implementación:** [T-251](../backlog.md#t-251-mcp-rechaza-un-valor-que-fijó-el-operador)
