# ADR-0029: Cada campo de la API tiene efecto

- **Estado:** aceptada
- **Drivers:** es mejor una función cubierta que una prometida. `meta.options.hint` no llegaba a ningún lado. `deprecated` solo aparecía en la ayuda, así que quien usaba la opción no se enteraba, y la demo repetía el aviso a mano. Los plugins declaraban `version: '0.1.0'` fijo, y nada leía ese campo.
- **Decisión:** `hint` sale de `OptionMeta` y `OptionSchema`. Usar una opción con `deprecated` desde CLI, env o config avisa por stderr, y el comando corre normalmente. `PluginMeta.version` pasa a ser opcional e informativo, y los plugins oficiales no lo declaran. La compatibilidad con `core` la expresan los `peerDependencies`.
- **Alternativas descartadas:** mostrar `hint` en la ayuda suma superficie sin un pedido real. Dejar `deprecated` solo como dato obliga a cada CLI a escribir su aviso. Leer la versión del `package.json` agrega código para un valor sin consumidores.
- **Costo aceptado:** quitar `hint` rompe la compilación de quien lo declare. Un script que trata cualquier salida por stderr como falla verá el aviso de deprecación.
- **Revisar si:** usuarios reales piden describir el formato de un valor en la ayuda, o hace falta validar compatibilidad entre plugins y `core` en runtime.
- **Código:** `packages/core/src/parse/deprecated.ts`, `packages/core/src/types.ts`
