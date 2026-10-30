# ADR-0020: Un comando, para personas y agentes

- **Estado:** aceptada
- **Drivers:** Runa no busca ser una copia de commander. Cerca de la mitad de los CLIs públicos con commander no definen subcomandos (215 de 388 archivos). Escribir un servidor MCP a mano es tedioso, y los wrappers que leen `--help` dependen de la calidad de ese texto.
- **Decisión:** el diferencial es que un mismo schema da CLI, ayuda, completions y tool MCP. Cada cambio se decide con dos reglas: sencillo por defecto y reemplazable siempre, y el dev no escribe nada dos veces. Lo básico que todos esperan se hace lo justo. No se persigue paridad de funciones.
- **Alternativas descartadas:** competir por paridad con commander. Enfocarse solo en MCP, cuando hay fuentes que recomiendan CLI por defecto para agentes con shell.
- **Costo aceptado:** habrá pedidos válidos que queden fuera. Sumar MCP como prioridad posterga mejoras de la ayuda.
- **Revisar si:** el uso real muestra que casi nadie activa `--mcp`, o que los agentes prefieren invocar la CLI directamente.
- **Evidencia:** [uso de CLIs](../research/2026-10-cli-usage.md)
