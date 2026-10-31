# ADR-0017: Cada comando es una tool MCP

- **Estado:** aceptada
- **Drivers:** evitar reescribir como servidor MCP lo que ya está definido en el schema. MCP tiene un solo `inputSchema` por tool, y Zod v4 implementa Standard Schema.
- **Decisión:** `--mcp` inicia un servidor stdio. Cada comando hoja es una tool, y su nombre es la ruta unida con `_`. `args` y `options` se unen en un solo input y se separan al ejecutar. Si hay `output`, la tool devuelve `structuredContent`. Los errores vuelven como `isError: true`. El plugin no llama a `process.exit` mientras el servidor vive.
- **Alternativas descartadas:** convertir schemas es innecesario con Standard Schema. Separar args y options no encaja con MCP.
- **Costo aceptado:** un argumento y una opción con el mismo nombre chocarían en el input.
- **Revisar si:** se necesita otro transporte además de stdio.
- **Código:** `packages/mcp/src/schema.ts`, `packages/mcp/src/server.ts`, `packages/mcp/src/plugin.ts`