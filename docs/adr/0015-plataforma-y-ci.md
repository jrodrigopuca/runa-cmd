# ADR-0015: ESM, Node 24+ y CI en Linux y Windows

- **Estado:** aceptada
- **Drivers:** Node 18 y 20 están fuera de soporte, y vitest 4 no puede probarlos: Node 18 ni arranca. Una plataforma sin probar no está soportada.
- **Decisión:** los paquetes son solo ESM y `engines` exige `>=24.0.0`. CI corre lint, typecheck y build en Ubuntu, tests en Ubuntu y Windows con Node 24, y cobertura en una sola celda. El mínimo de 80% de líneas de `core` vive en `vitest.config.ts`. `core` no registra señales. Las completions de PowerShell quedan fuera de alcance.
- **Alternativas descartadas:** mantener Node 18, 20 y 22 sin poder probarlos. Guardas de plataforma en los handlers de señales de MCP, que quitarían Ctrl-C en Windows. Workflows reutilizables o caché con Turborepo, innecesarios a este tamaño.
- **Costo aceptado:** quienes usan Node más viejo quedan afuera, y con una sola línea de Node no se detectan divergencias entre versiones.
- **Revisar si:** una nueva línea LTS se vuelve la base, o Windows deja de aportar fallos reales.
- **Código:** `.github/workflows/ci.yml`, `packages/core/vitest.config.ts`
