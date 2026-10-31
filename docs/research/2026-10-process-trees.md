# Parar un árbol de procesos

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿cómo debería parar Runa una ejecución con varios procesos, y qué resuelven otros?

**Decisión resultante:** [ADR-0033](../adr/0033-parar-recorre-el-arbol-de-procesos.md), implementada en [T-305](../backlog.md#t-305-cancelación-y-límites).

## Método

- **Runa:** un CLI real, compilado desde `main` en `1ed131e`, cuyo comando lanza un proceso. Corrió en macOS con Node 26.
- **commander:** lectura de `lib/command.js` en la versión 15.0.0, sin ejecutarlo.
- **execa:** lectura de su documentación de terminación.

## Qué hace Runa hoy

| Señal | Exit | `cleanup` | Proceso del comando |
|---|---|---|---|
| `SIGINT` al grupo, como Ctrl+C | Muerto por señal | No corre | Muere |
| `SIGINT` solo al CLI | Muerto por señal | No corre | Sobrevive |
| `SIGTERM` solo al CLI | Muerto por señal | No corre | Sobrevive |

`cleanup` corre ante errores, pero no ante señales, porque `core` no instala handlers.

## Canal de vida

Un hijo con canal IPC, en un grupo propio, recibió `disconnect` en los dos casos, y le alcanzó para terminar un `cleanup` asíncrono:

| Caso | `disconnect` | `cleanup` |
|---|---|---|
| El padre muere con `SIGKILL` | Sí | Termina |
| El padre corta el canal y sigue vivo | Sí | Termina |

La prueba de [T-300](../backlog.md#t-300-comprobar-lo-crítico-en-windows) comprobó el segundo caso en Windows. El primero todavía no se probó ahí.

## commander

Solo lanza procesos para los subcomandos ejecutables. Los comandos con `.action()` corren en el mismo proceso.

| Tema | Comportamiento |
|---|---|
| Señales | Reenvía `SIGUSR1`, `SIGUSR2`, `SIGTERM`, `SIGINT` y `SIGHUP` al hijo directo |
| Salida | El padre sale con el código del hijo |
| Hijo muerto por señal | Exit 1: `code ?? 1` pierde la causa |
| Hijo que ignora la señal | Espera sin plazo |
| Nietos y muerte del padre | No los atiende |

## execa

- `forceKillAfterDelay` fuerza el cierre a los 5 s por defecto, y no funciona en Windows.
- `gracefulCancel` avisa por IPC, sin señal, y solo sirve con archivos de Node.
- `killDescendants` crea un grupo propio y es *best-effort*: un descendiente con su propio grupo o sesión se escapa, y Ctrl+C deja de llegar al subproceso.
- En Windows usa `taskkill`, y una vez que el subproceso terminó, sus descendientes ya no se alcanzan.

## Conclusiones

- **El árbol tiene tres niveles,** y Runa solo ve el último como grupo: el padre, el hijo de la tool y los procesos del comando.
- **El aviso tiene que bajar por un camino explícito.** Un hijo en su propio grupo no recibe Ctrl+C.
- **Un plazo no se puede delegar solo en el padre.** Si el servidor murió, el hijo tiene que detenerse por su cuenta.
- **En Windows, el orden importa.** El árbol se termina con el hijo vivo.

## Fuentes

- [commander 15.0.0, `lib/command.js`](https://cdn.jsdelivr.net/npm/commander@15.0.0/lib/command.js)
- [execa, documentación de terminación](https://github.com/sindresorhus/execa/blob/main/docs/termination.md)
