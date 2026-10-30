# ADR-0004: Plugins con capacidades, orden topológico y carga diferida

- **Estado:** aceptada
- **Drivers:** extender la CLI sin hacer crecer `core`. Los plugins pesados, como MCP, no deberían sumar tiempo de arranque si no se usan.
- **Decisión:** un plugin declara `meta`, `capabilities`, `setup(api)` y `cleanup()`. Agregar comandos, opciones globales o middleware exige declarar la capacidad, y usar un hook no. Las dependencias entre plugins se ordenan con Kahn, con error ante ciclos o faltantes. Un plugin puede ser un objeto o un `() => import(...)`.
- **Alternativas descartadas:** el orden manual es propenso a errores. La comunicación por eventos es excesiva para la cantidad de plugins prevista.
- **Costo aceptado:** los plugins se resuelven dentro de `run()`, así que la superficie completa de opciones no se conoce al llamar a `defineCLI`.
- **Revisar si:** los plugins necesitan comunicarse entre sí, o las capacidades dejan de cubrir lo que hacen.
- **Código:** `packages/core/src/plugin.ts`
