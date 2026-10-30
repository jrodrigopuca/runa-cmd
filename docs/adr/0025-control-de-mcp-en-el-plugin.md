# ADR-0025: El control de tools MCP vive en el plugin

- **Estado:** aceptada
- **Drivers:** hoy cualquier comando, incluido un `deploy`, queda disponible para un agente. `core` no debe conocer MCP. Las anotaciones de MCP son pistas para el cliente, no control de acceso.
- **Decisión:** `mcpPlugin()` acepta `exclude` y una forma de marcar comandos como de solo lectura o destructivos. Excluir elimina la tool. `core` no gana campos de MCP. Por defecto se siguen exponiendo todos los comandos.
- **Alternativas descartadas:** `meta.mcp` en cada comando acopla `core` con un plugin. Una lista de permitidos por defecto rompe la promesa de "una flag".
- **Costo aceptado:** la configuración queda lejos de la definición del comando, y un comando nuevo se expone si nadie lo excluye.
- **Revisar si:** los usuarios olvidan excluir comandos peligrosos, o piden una lista de permitidos por defecto.
- **Implementación:** [T-302](../backlog.md#t-302-excluir-y-anotar-tools)
