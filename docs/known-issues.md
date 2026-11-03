# Problemas conocidos

> **Verificado:** 2026-10-31, sobre `0.2.0-beta.2` compilada desde `main`.

Cada problema tiene una tarea en el [backlog](./backlog.md). Al cerrarla, se borra la fila y el historial queda en git.

**Evidencia:** *observado* significa ejecutado; *leído* significa visto en el código, sin ejecutar.

**Severidad:**

- **Alta:** resultado incorrecto sin aviso, recursos sin liberar, o el diferencial de Runa no funciona.
- **Media:** falla visible con workaround, o fricción en el primer uso.
- **Baja:** mensaje confuso o inconsistencia.

## Severidad alta

No hay problemas abiertos de esta severidad.

## Severidad media

| ID | Problema | Evidencia | Causa | Tarea |
|---|---|---|---|---|
| KI-041 | El campo `readme` del registro de npm está vacío, así que `npm view` no lo muestra. La página de npm sí muestra el README | Observado | Sin confirmar: la publicación envía el README, y el campo parece llenarse desde `latest` | [T-506](./backlog.md#t-506-salir-de-pre-release-y-publicar-100) |

## Severidad baja

No hay problemas abiertos de esta severidad.
