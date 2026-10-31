# ADR-0030: Cada tool MCP corre en un subproceso de la propia CLI

- **Estado:** aceptada
- **Complementa:** [ADR-0017](./0017-mapeo-de-comandos-a-tools-mcp.md) y [ADR-0025](./0025-control-de-mcp-en-el-plugin.md)
- **Drivers:** una tool debería ser el mismo comando que corre una persona, sin una segunda forma de ejecutarlo. En proceso, un `process.exit` mata al servidor, la salida de llamadas simultáneas se mezcla y stdout ensucia el protocolo. Un prototipo midió 245 a 272 ms por llamada contra 0,2 ms en proceso, con 20 llamadas simultáneas en 2,1 s.
- **Decisión:** cada llamada ejecuta la propia CLI como proceso hijo. La entrada viaja como JSON por un canal interno, no como argv, y el hijo saltea el parseo. El resultado vuelve por otro canal interno. Lo que fija quien opera (env, config y globales de arranque) sale del schema de la tool, y el modelo no lo puede cambiar. No hay estado entre llamadas: cada una corre `setup`, hooks, middleware y `cleanup`.
- **Alternativas descartadas:** una función `execute` compartida en proceso, como incur, cuesta parecido (5 a 7 días contra 6 a 8, estimados) y deja sin resolver `process.exit` y la salida heredada. Traducir la llamada a argv, como Ophis y el prototipo, rompe arrays, objetos, transforms y entradas grandes. Un modo en proceso opcional por tool queda para cuando alguien lo pida: es aditivo.
- **Costo aceptado:** unos 250 ms por llamada, más el arranque de la CLI. Un pool de conexiones no se comparte entre llamadas. Los binarios compilados requieren declarar cómo reinvocarse. Separar parseo y ejecución en `core` sigue siendo necesario.
- **Revisar si:** Windows no soporta los canales o la cancelación, el arranque real de una CLI pasa de 1 s, o hace falta estado compartido entre llamadas. En cualquiera de esos casos, la alternativa es la ejecución en proceso.
- **Evidencia:** [prototipo](../research/2026-10-mcp-subprocess-spike.md)
- **Implementación:** [T-300](../backlog.md#t-300-comprobar-lo-crítico-en-windows) a [T-306](../backlog.md#t-306-valores-de-quien-opera-fuera-del-schema)
