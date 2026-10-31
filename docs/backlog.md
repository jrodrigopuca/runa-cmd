# Backlog de Runa hacia v1

**Dirección:** un comando, para personas y agentes. Un solo schema da el CLI, la ayuda, las completions y la tool MCP.

**Reglas para decidir cada cambio:**

- Sencillo por defecto, reemplazable siempre.
- El dev no escribe nada dos veces.
- No buscamos paridad con commander: lo básico se hace lo justo para que nadie abandone en los primeros cinco minutos.

**Criterio de v1:** la API pública no necesita cambios incompatibles durante una ventana sostenida de uso real. La ventana se define en T-501 y empieza a contar cuando se publica la beta que incluye T-208.

## Cómo leerlo

- **v1 Requerido:** bloquea la versión 1.0.0, porque corrige un error, define el contrato o prepara el release.
- **v1 Opcional:** es aditivo y puede llegar en 1.x.
- **Estado:** `Pendiente`, `Decisión pendiente`, `En curso`, `Hecho` o `Descartado`.
- **Orden:** el de la tabla. Dentro de una fase se puede reordenar, salvo que haya un bloqueo indicado.

**Definición de terminado:** se cumplen los criterios, pasan tests, typecheck y lint, y los cambios a paquetes publicados llevan su changeset y la documentación actualizada.

## Resumen

| Fase | ID | Tarea | v1 | Estado |
|---|---|---|---|---|
| 1. Base confiable | T-001 | Tests de aceptación con procesos reales | Requerido | Hecho |
| | T-002 | Type tests en CI | Requerido | Hecho |
| | T-003 | Documentación fiel al estado real | Requerido | Hecho |
| | T-004 | Spec y decisiones visibles en el repo | Requerido | Hecho |
| | T-101 | `cleanup` corre también ante errores | Requerido | Hecho |
| | T-102 | Booleanos desde env y config | Requerido | Hecho |
| | T-103 | Errores de uso consistentes | Requerido | Hecho |
| | T-104 | Avisar cuando falta el valor de una opción | Requerido | Hecho |
| | T-105 | Sugerencias de typo proporcionales | Requerido | Hecho |
| | T-106 | Mensajes y ayuda sin ruido | Requerido | Hecho |
| | T-107 | Versión real en los plugins | Requerido | Hecho |
| | T-108 | Resolver metadatos sin efecto | Requerido | Hecho |
| 2. Comando único | T-201 | `--version` integrado | Requerido | Hecho |
| | T-202 | `--` llena posicionales | Requerido | Hecho |
| | T-203 | `runCLI` con plugins y modo raíz explícito | Requerido | Hecho |
| 3. MCP utilizable | T-300 | Comprobar lo crítico en Windows | Requerido | Hecho |
| | T-301 | Separar parseo y ejecución en `core` | Requerido | Hecho |
| | T-303 | Ejecutar cada tool en un subproceso | Requerido | Hecho |
| | T-306 | Valores de quien opera fuera del schema | Requerido | Hecho |
| | T-304 | Contrato de resultado y errores | Requerido | Hecho |
| | T-305 | Cancelación y límites | Requerido | Hecho |
| | T-302 | Excluir y anotar tools | Requerido | Hecho |
| | T-307 | Evento por llamada | Opcional | Pendiente |
| | T-308 | Comandos de plugins fuera de las tools | Opcional | Pendiente |
| 4. Primer uso | T-204 | `--help` en `core`, reemplazable | Requerido | Hecho |
| | T-205 | Ruteo único para la ayuda | Requerido | Hecho |
| | T-206 | Kebab-case por defecto | Requerido | Hecho |
| | T-207 | Opciones repetidas con `z.array()` | Requerido | Hecho |
| 5. Validación | T-401 | Publicar la siguiente beta | Requerido | Hecho |
| | T-402 | Revalidar qr-plus | Requerido | Hecho |
| | T-404 | Usar MCP desde un agente real | Requerido | En curso |
| | T-403 | Migración de un dev externo | Opcional | Pendiente |
| | T-209 | Lo que sobra después de `--` no se pierde | Requerido | Hecho |
| | T-210 | Nombre del valor en la ayuda | Requerido | Hecho |
| | T-211 | Errores de uso desde un comando | Opcional | Pendiente |
| | T-219 | Las opciones globales leen el config | Requerido | Pendiente |
| | T-220 | Forma del archivo de config | Requerido | Pendiente |
| | T-221 | Probar una CLI sin subproceso | Requerido | Pendiente |
| | T-212 | Lo que devuelve un comando llega a la terminal | Requerido | Pendiente |
| | T-222 | Los posicionales convierten como las opciones | Requerido | Pendiente |
| | T-223 | Flag desconocida en la raíz | Requerido | Pendiente |
| | T-224 | Salida de ayuda sin estilos fuera de una terminal | Requerido | Pendiente |
| | T-225 | Completions con eval y texto con símbolos | Requerido | Pendiente |
| | T-213 | Nombre de los comandos | Requerido | Pendiente |
| | T-214 | La ayuda de un subcomando muestra la CLI | Requerido | Pendiente |
| | T-215 | README y changelog en npm | Requerido | Pendiente |
| | T-309 | Fallos sin efecto por MCP | Requerido | Pendiente |
| | T-216 | Opción faltante con su variable de entorno | Opcional | Pendiente |
| | T-217 | Valor por defecto legible en la ayuda | Opcional | Pendiente |
| | T-218 | Parada limpia de un servicio | Opcional | Pendiente |
| | T-310 | Valores fijos que no son secretos | Opcional | Pendiente |
| | T-226 | Ruta completa en hooks y middleware | Opcional | Pendiente |
| | T-227 | Detalles de ayuda y errores | Opcional | Pendiente |
| | T-208 | Retirar el modo implícito | Requerido | Pendiente |
| 6. Contrato v1 | T-501 | Criterio de estabilidad verificable | Requerido | Hecho |
| | T-502 | Política de semver y deprecación | Requerido | Hecho |
| | T-503 | Documentación de v1 | Requerido | Pendiente |
| | T-504 | Grupo de versiones de los paquetes | Requerido | Hecho |
| | T-505 | Trusted Publishing | Opcional | Pendiente |
| | T-506 | Salir de pre-release y publicar 1.0.0 | Requerido | Pendiente |
| Después | T-601 | `ctx.stdin` | Opcional | Pendiente |
| | T-602 | Ancho correcto para CJK y emoji | Opcional | Pendiente |
| | T-603 | Completions de rutas de archivo | Opcional | Pendiente |
| | T-604 | `#RGB` en temas | Opcional | Pendiente |

## Fase 1: base confiable

### T-001 Tests de aceptación con procesos reales

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero probar la CLI como la usa una persona, para no depender de mocks de `process.exit`, que ya ocultaron un bug.
- **Criterios de aceptación:**
  - La [tabla de aceptación del feedback de qr-plus](./research/2026-10-qr-plus-migration.md#casos-para-tests-de-aceptación) existe como tests que lanzan un proceso real y verifican stdout, stderr y exit code.
  - Las filas aún sin resolver quedan marcadas como fallo esperado y pasan a tests normales al cerrar su tarea.
  - `runCLI` deja de figurar como no cubierto en el reporte de cobertura.

### T-002 Type tests en CI

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero que CI verifique la inferencia de tipos, porque es una de las promesas centrales de Runa y hoy `pnpm test` no la comprueba.
- **Criterios de aceptación:**
  - `pnpm test` ejecuta `types.test-d.ts` con typecheck.
  - Un error de tipos introducido en ese archivo hace fallar CI.

### T-003 Documentación fiel al estado real

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como dev que evalúa Runa, quiero que la documentación diga la verdad, para no descubrir las diferencias usando el producto.
- **Criterios de aceptación:**
  - Los paquetes figuran como beta, no como `Stable`.
  - El README deja de fijar a mano la cantidad de tests.
  - El README de `core` pide Node 24+.
  - Los ejemplos muestran invocaciones reales de un comando único, sin `my-cli greet world`.
  - El README de MCP describe la respuesta real de un comando sin retorno.
  - "Zero runtime deps" aclara que Zod es un peer obligatorio.
  - Las instrucciones instalan la versión documentada (`@beta`), y funcionan en un proyecto limpio.
  - Los READMEs no prometen funciones que no existen ni tipos distintos de los reales.
  - Las limitaciones que afectan el primer uso están visibles y enlazan a los known issues.

### T-004 Spec y decisiones visibles en el repo

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como colaborador, quiero leer el spec y las decisiones que cita el código, para entender por qué funciona así. `docs/` reemplaza a `RUNA-SPEC.md` y `openspec/` ([ADR-0026](./adr/0026-docs-como-fuente-de-verdad.md)).
- **Criterios de aceptación:**
  - Nada en `CONTRIBUTING.md` ni en el código remite a un documento que un clon limpio no tenga.
  - Las decisiones de este backlog (`--`, modo raíz, `--help`, kebab-case y alcance de MCP) quedan registradas con su condición de revisión.
  - El feedback de qr-plus queda versionado en `docs/research/`.
  - `RUNA-SPEC.md` y `openspec/` se eliminan, y salen de `.gitignore`.

### T-101 `cleanup` corre también ante errores

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de plugins, quiero que `cleanup` corra siempre, para liberar recursos aunque el comando falle. Hoy `process.exit` en `cli.ts:451` se ejecuta antes del `finally`. Además, ninguna salida por error debe ser silenciosa: quien usa la CLI necesita saber qué pasó, y quien la desarrolla, cómo investigarlo.
- **Criterios de aceptación:**
  - Dado un error no manejado, el hook `cleanup` y el `cleanup()` del plugin corren antes de terminar, incluso si son asíncronos.
  - Los exit codes no cambian, salvo el de `handled`.
  - Toda salida por error explica el motivo:

  | Caso | stderr | Exit |
  |---|---|---|
  | `RunaError` con mensaje | El mensaje, tal cual | El del error |
  | Error inesperado | `Unexpected error in '<comando>': <mensaje>`, y cómo ver el detalle | 1 |
  | Error sin mensaje | `'<comando>' failed without an error message (<tipo>)`, y cómo ver el detalle | El del error, o 1 |
  | Falla antes de resolver el comando | Igual, usando el nombre de la CLI | El del error, o 1 |
  | Un plugin marca `ctx.handled` | Nada de Runa; la salida es del plugin | El del error, o 1 |
  | El plugin se recuperó y fijó `process.exitCode = 0` | Nada de Runa | 0 |

  - `RUNA_DEBUG=1` agrega stack, código de error y causa. Sin esa variable, no se muestra stack.
  - Lo cubren tests con proceso real, sin mockear `process.exit`.

### T-102 Booleanos desde env y config

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de una CLI, quiero activar opciones booleanas por env o config, para que se respete el orden CLI > env > config > default documentado.
- **Criterios de aceptación:**

  | Schema | Fuente | Resultado |
  |---|---|---|
  | `z.boolean().default(false)` | `MINIFY=true` | `true` |
  | `z.boolean().default(false)` | config `minify: true` | `true` |
  | `z.boolean().optional()` | `MINIFY=1` | `true` |
  | Cualquiera booleano | `MINIFY=false` o `0` | `false` |
  | Cualquiera booleano | `MINIFY=quizas` | exit 2, nombra opción y valor esperado |
  | `z.boolean().default(false)` | env `true` y CLI `--no-minify` | `false` |

### T-103 Errores de uso consistentes

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de scripts, quiero que todo error de uso salga con el mismo código, para poder distinguirlo de un fallo del comando.
- **Criterios de aceptación:**
  - Un posicional de más en un comando sin args da exit 2, con el mismo formato que `Unexpected positional argument`.
  - Si `run()` devuelve algo que no cumple `output`, el mensaje nombra el comando y el campo, sin volcar JSON de Zod.
  - `--minify=false` funciona. Resuelto en T-102.

### T-104 Avisar cuando falta el valor de una opción

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de una CLI, quiero que me digan que falta un valor, para no recibir un error de tipo engañoso.
- **Criterios de aceptación:**
  - `tool hola -e`, `--label` y `--offset` dan exit 2 y un mensaje como `Option -e, --ecl requires a value`.
  - Vale para enum, string y number, también en opciones globales.
  - `--tag --force` no toma la flag como valor. `--tag=--force`, `--tag -texto` y `--offset -1` siguen funcionando.

### T-105 Sugerencias de typo proporcionales

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de una CLI, quiero sugerencias relevantes, porque una mala confunde más que ninguna.
- **Criterios de aceptación:**
  - `--nope` no sugiere `--size`, y `--help` no sugiere `--ecl`.
  - `--outptu` sigue sugiriendo `--output`.
  - El umbral depende del largo del nombre, y aplica a opciones y comandos.

### T-106 Mensajes y ayuda sin ruido

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de una CLI, quiero errores y ayuda breves, con el siguiente paso claro.
- **Criterios de aceptación:**
  - La ayuda omite `[default: false]` en booleanos.
  - El error de posicional dice `Missing required argument: <content>`, sin repetir el nombre.
  - Si la CLI tiene `--help`, los errores de uso terminan con `Run '<tool> --help' for usage.`. Si no la tiene, la pista no aparece.

### T-107 Versión real en los plugins

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero que `meta.version` de un plugin no diga algo falso. Help, MCP y completions declaraban `0.1.0` fijo, y nadie lee ese campo.
- **Criterios de aceptación:**
  - `PluginMeta.version` es opcional, y un test de tipos lo comprueba.
  - Help, MCP y completions no declaran una versión.

### T-108 Resolver metadatos sin efecto

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como dev, quiero que cada campo de la API haga algo ([ADR-0029](./adr/0029-cada-campo-tiene-efecto.md)).
- **Criterios de aceptación:**
  - `hint` sale del tipo público.
  - Usar una opción con `deprecated` desde CLI, env o config avisa por stderr, y el comando corre normalmente.
  - La demo no escribe ese aviso a mano.

## Fase 2: comando único

### T-201 `--version` integrado

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero que `--version` funcione si declaro `meta.version`, sin escribir un plugin.
- **Criterios de aceptación:**
  - `tool --version` y `tool hola --version` imprimen la versión y salen con 0, sin `process.exit` en la ruta normal.
  - `runCLI` conserva el `meta.version` del comando.
  - Sin `meta.version` no se registra la flag.
  - Una opción propia `--version` tiene prioridad y no falla al arrancar.
  - No hay alias corto por defecto.

### T-202 `--` llena posicionales

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de una CLI, quiero pasar valores que empiezan con guion usando `--`, como indica POSIX. Ajusta el cambio 4 de la beta.
- **Criterios de aceptación:**

  | Entrada | Resultado |
  |---|---|
  | `tool -- -text` | `args.content === "-text"`, `rest` vacío |
  | `tool hola -- -text` | `args.content === "hola"`, `rest === ["-text"]` |
  | `exec [target] -- ls -la` | `target === "ls"`, `rest === ["-la"]` |
  | Comando sin posicionales, `run -- npm test` | `rest === ["npm", "test"]` |
  | `tool -- --help` | No muestra ayuda, `--help` es dato |
  | `lint -- -a -b`, con variádico vacío | `files === ["-a", "-b"]` |
  | `lint a.ts -- --fix`, con variádico lleno | `files === ["a.ts"]`, `rest === ["--fix"]` |

  - La nota de migración explica el caso de `[target]`.

### T-203 `runCLI` con plugins y modo raíz explícito

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI de un comando, quiero usar plugins sin cambiar la forma de mi programa, y que ningún dato del usuario cambie de significado.
- **Criterios de aceptación:**
  - `runCLI(cmd, { plugins })` funciona con help, MCP y completions.
  - No se agrega `defineCLI({ command })`.
  - `tool tool` usa `"tool"` como contenido.
  - Con `completionsPlugin`, `tool hola` corre el comando raíz.
  - `tool completions bash` corre el subcomando, y `tool -- completions` pasa el texto como dato.
  - `--mcp` expone el comando raíz con el nombre de `meta.name`.
  - `defineCLI` con un solo comando sigue funcionando, pero avisa la deprecación y recomienda `runCLI`.
  - Si esto exige reescribir los generadores de completions, se frena y se replantea antes de seguir.

## Fase 3: MCP utilizable

Cada tool corre en un subproceso de la propia CLI ([ADR-0030](./adr/0030-tools-mcp-en-subproceso.md)). La evidencia está en el [prototipo](./research/2026-10-mcp-subprocess-spike.md).

### T-300 Comprobar lo crítico en Windows

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero probar en Windows lo que sostiene el enfoque antes de construirlo, porque es la condición que más puede cambiar ADR-0030.
- **Criterios de aceptación:**
  - Un test con procesos reales corre en la matriz de CI: entrada JSON grande por un canal, resultado de 5 MB por otro, aviso de cancelación que deja correr `cleanup`, y cierre de un proceso con sus hijos.
  - Pasa en Linux, macOS y Windows.
  - Si falla en Windows sin solución razonable, se frena la fase y se revisa ADR-0030.

### T-301 Separar parseo y ejecución en `core`

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero una sola ejecución que reciba valores ya resueltos, para que CLI y tools corran exactamente lo mismo.
- **Criterios de aceptación:**
  - La CLI usa esa ejecución, y su comportamiento no cambia: todos los tests pasan sin tocarlos.
  - Se puede ejecutar un comando desde un objeto de entrada, sin argv.
  - Esa entrada se valida con los schemas del comando, y un `.transform` corre una sola vez.
  - Arrays, objetos y `z.number()` posicional funcionan sin pasar por flags.
  - `HookContext` indica si la ejecución viene de la CLI o de una tool.

### T-303 Ejecutar cada tool en un subproceso

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero que una tool sea el mismo comando que corre una persona, con mi middleware, hooks, env y config.
- **Criterios de aceptación:**
  - Una llamada corre `beforeRun`, middleware, `run()`, `afterRun` y `cleanup`.
  - Un middleware que rechaza impide la ejecución, y la tool devuelve error, sin falso éxito.
  - `console.log` y `process.stdout.write` no llegan al protocolo.
  - El valor devuelto gana, y stdout se usa solo si el comando no devuelve nada.
  - Dos llamadas simultáneas no se mezclan.
  - Un `process.exit` del comando no tumba al servidor.
  - La entrada y el resultado viajan por canales internos, no documentados como API.
  - Un `.transform` no corre dos veces: el servidor reenvía la entrada sin transformar, y valida el hijo.
  - Una CLI anidada no hereda esos canales ni sus variables.
  - El servidor comprueba al arrancar que puede ejecutarse a sí mismo, y `selfCommand` permite declararlo si no puede.
  - El servidor importa el SDK en diferido.

### T-306 Valores de quien opera fuera del schema

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como quien opera un servidor, quiero que lo que configuré no lo pueda cambiar el modelo, y que el modelo no vea secretos.
- **Criterios de aceptación:**
  - Una opción que declara `env` nunca entra en el `inputSchema`, tenga o no valor. Tampoco una con valor de config, ni las globales de arranque.
  - Si a esa opción le falta un valor requerido, la llamada falla con el error normal de la CLI.
  - Enviar esa opción igualmente no cambia el valor.
  - Una opción requerida que ya viene de env no le exige nada al modelo.
  - Un `.default()` no pisa el valor de un archivo de config.
  - `mcpPlugin({ tools: { deploy: { expose: ['region'] } } })` deja una opción concreta en manos del modelo.
  - `mcpPlugin({ tools: { deploy: { serverOnly: ['token'] } } })` hace fallar el arranque si esa opción no tiene valor.
  - Un nombre de tool u opción inexistente en `tools` hace fallar el arranque.
  - Los valores fijos de 8 caracteres o más no aparecen en el stdout ni el stderr devueltos al modelo. Lo que `run()` devuelve no se altera: es decisión del autor.

### T-304 Contrato de resultado y errores

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como agente, quiero saber si puedo reintentar, y que un error no me lleve a repetir un efecto que ya ocurrió.
- **Criterios de aceptación:**
  - Lo accionable está en el texto: `_meta` es para el cliente, y que llegue al modelo depende de él.
  - `structuredContent` solo aparece si el comando declara `output`.
  - Un error indica en `_meta['runa/error']` su `class`, `effect` (`none`, `completed` o `unknown`) y `safeToRetry`.
  - Un comando que falla a mitad informa efecto desconocido, nunca que no hizo nada.
  - Si `run()` terminó pero el `output` es inválido, informa que el comando ya corrió, sin JSON crudo de Zod.
  - Si falla un paso posterior a `run()`, informa que el comando ya corrió.
  - Un exit 0 sin resultado de la ejecución es un error: nunca un falso "Done".
  - El texto de una tool no incluye pistas para personas, como `RUNA_DEBUG` o `--help`.

### T-305 Cancelación y límites

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona o quien opera un servidor, quiero que parar libere recursos en todo el árbol de procesos, y que un comando no pueda tumbar el servidor con su salida. Sigue [ADR-0033](./adr/0033-parar-recorre-el-arbol-de-procesos.md).
- **Criterios de aceptación:**
  - `SIGINT` y `SIGTERM` en la CLI disparan `ctx.signal` y corren `cleanup`, con exit 130 y 143.
  - Una segunda señal sale al instante.
  - Un comando que ignora la parada no retiene el proceso más que el plazo.
  - Cancelar una llamada corre `cleanup`, y `ctx.signal` avisa al comando.
  - Una llamada cancelada informa `class: 'cancelled'` y efecto desconocido.
  - Un hijo que ignora la cancelación muere pasado un plazo.
  - Los procesos que inició el comando también terminan, salvo los que crearon su propio grupo o sesión.
  - Si el servidor muere, aun con `SIGKILL`, sus hijos no quedan corriendo.
  - Cerrar el servidor cancela las llamadas en curso antes de correr su `cleanup`.
  - La llamada termina aunque un proceso nieto retenga stdio.
  - Hay un tope de salida global y por tool, de 100 KiB por defecto, con inicio y final, y un aviso de truncado.
  - Un valor devuelto que supera el tope no se trunca: es `output_too_large` con efecto `completed`.
  - 600 MB en stdout no tumban el servidor.

### T-302 Excluir y anotar tools

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero elegir qué expongo a un agente y marcar lo peligroso, sin tocar `core`.
- **Criterios de aceptación:**
  - `mcpPlugin({ exclude: ['deploy'] })` evita que la tool exista y que pueda llamarse.
  - `tools: { deploy: { annotations } }` acepta las anotaciones de MCP tal como las define la especificación, y llegan a `tools/list`.
  - `readOnlyHint` y `destructiveHint` juntos en `true` fallan al arrancar, porque se contradicen.
  - Una tool excluida con ajustes en `tools` falla al arrancar.
  - Se puede dar una descripción propia por tool.
  - La documentación aclara que las anotaciones son pistas para el cliente, no control de acceso.
  - `exclude` con un nombre inexistente falla al arrancar.
  - Un snapshot de `tools/list` detecta cambios en lo que ve el modelo.

### T-307 Evento por llamada

- **v1:** Opcional
- **Estado:** Pendiente
- **Bloqueada por:** T-303
- **Descripción:** como quien opera un agente, quiero auditar cada llamada a una tool, sin depender del cliente.
- **Criterios de aceptación:**
  - Cada llamada emite un evento con tool, `requestId`, duración, resultado y bytes de salida.
  - Los argumentos van redactados.
  - El evento nunca va a stdout.

### T-308 Comandos de plugins fuera de las tools

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero que un agente no vea comandos que un plugin agregó para personas, sin tener que conocerlos para excluirlos.
- **Criterios de aceptación:**
  - `completions` no aparece como tool cuando la CLI usa `completionsPlugin`, sin configurar `exclude`.
  - Un plugin puede marcar un comando como solo para la CLI, sin que `core` conozca MCP.
  - Un comando del autor sigue siendo una tool por defecto.

## Fase 4: primer uso

### T-204 `--help` en `core`, reemplazable

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como dev que prueba Runa, quiero ayuda desde el primer comando, sin instalar otro paquete. `helpPlugin` queda para temas y renderers propios.
- **Criterios de aceptación:**
  - `tool --help`, `tool -h` y `tool hola --help` salen con 0 y muestran argumentos y opciones, sin plugins.
  - La ayuda y las completions listan `--version` cuando la CLI tiene versión.
  - Con `helpPlugin`, se usa su renderer.
  - Si un comando declara `-h`, gana el usuario y la CLI arranca, con o sin `helpPlugin`.
  - `core` sigue sin dependencias de runtime.
  - Las secciones del renderer básico y del plugin se comparan con un test.

### T-205 Ruteo único para la ayuda

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de una CLI, quiero ver la ayuda de lo que pedí, sin que la ayuda resuelva comandos por su cuenta.
- **Criterios de aceptación:**
  - `tool db migrate --help` muestra `db migrate`.
  - La ayuda de un comando único muestra su uso real, sus argumentos y las opciones globales.
  - Un CLI multi-comando sin argumentos muestra la ayuda por stderr y sale con 2.
  - `tool db` sin subcomando muestra la ayuda de `db` por stderr y sale con 2.
  - Un subcomando que no existe sigue siendo 127, con su sugerencia.
  - `--help` y `--version` funcionan aunque falte una opción global obligatoria.
  - Ejecutar un comando y mostrar su ayuda usan la misma función de ruteo.
  - `resolveTarget` desaparece de `@runa-cmd/help`.

### T-206 Kebab-case por defecto

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero escribir `darkColor` en TypeScript y exponer `--dark-color` en la terminal.
- **Criterios de aceptación:**
  - `--dark-color` entrega `options.darkColor`, y `outputURL` se expone como `--output-url`.
  - `--no-dark-mode` niega un booleano `darkMode`.
  - `--darkColor` da exit 2 y sugiere `--dark-color`.
  - Una clave ya escrita como `'dark-color'` no cambia.
  - Ayuda, errores y las tres shells de completions muestran kebab-case desde un único campo del schema.
  - Las tools MCP y los archivos de config siguen usando la clave en camelCase.
  - Un booleano `noCache` falla al arrancar con un mensaje que propone `cache`.
  - Dos claves que dan la misma flag fallan al arrancar.

### T-207 Opciones repetidas con `z.array()`

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero aceptar `--tag a --tag b`. Hoy una opción `z.array()` falla siempre, incluso con un solo valor.
- **Criterios de aceptación:**
  - `--tag a --tag b` entrega `['a', 'b']`, y `--tag a` entrega `['a']`.
  - Cada elemento se convierte como su tipo: `z.array(z.number())` entrega números, y un enum inválido nombra la flag.
  - Un alias largo y la flag se acumulan.
  - Las opciones que no son arrays conservan su comportamiento.
  - La ayuda y las completions indican que se puede repetir.
  - Env separa por comas, con trim, y un valor vacío es una lista vacía.
  - Config usa un array de JSON, sin separar strings.

## Fase 5: validación

### T-401 Publicar la siguiente beta

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero publicar estos cambios bajo `beta`, para probarlos en un proyecto real. La publicación es manual.
- **Criterios de aceptación:**
  - La versión llega al dist-tag `beta`, y `latest` no cambia.
  - `help`, `mcp` y `completions` exigen la versión de `core` que usan, y npm rechaza una anterior.
  - El changelog incluye una guía de migración con cada cambio de comportamiento.
  - Una instalación limpia corre el ejemplo del README.

### T-402 Revalidar qr-plus

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero comprobar en un proyecto real que el trabajo resolvió el problema, antes de iniciar la ventana de estabilidad. El detalle está en [la revalidación](./research/2026-10-qr-plus-revalidation.md).
- **Resultado:** con `0.2.0-beta.2`, qr-plus borró los cinco workarounds y el setup bajó de 165 a 77 líneas, con 48 pruebas de caja negra sobre su binario. Lo único que se perdió a propósito es `-V`, que el README de qr-plus no documentaba.
- **Criterios de aceptación:**
  - qr-plus borra los cinco workarounds sin cambiar su comportamiento.
  - Se registra cuántas líneas de setup quedan respecto de las 170 actuales.
  - Toda fricción nueva entra en este backlog.

### T-404 Usar MCP desde un agente real

- **v1:** Requerido
- **Estado:** En curso
- **Descripción:** como mantenedor, quiero ver una CLI real usada por un agente real, porque qr-plus no usa MCP y hasta ahora solo hay pruebas con un cliente propio. La prueba la hace otro proyecto, y su agente solo ve lo publicado, para que no lo sesgue conocer Runa por dentro.
- **Avance:** `local-beacon` adoptó `0.2.0-beta.2` y reportó 14 fricciones, [contrastadas](./research/2026-10-local-beacon-friction.md) y ya en este backlog. Falta comprobar que un modelo llame sus tools y qué hace ante un error.
- **Criterios de aceptación:**
  - El proyecto necesita MCP por sí mismo, y su agente lo adopta con el paquete publicado, sin acceso a este repo.
  - Un agente real llama tools de una CLI, por `--mcp`, y recibe el resultado completo.
  - Un error de la tool llega al agente con lo que ocurrió, y se registra qué hace el agente después.
  - Toda fricción nueva entra en este backlog.

### T-403 Migración de un dev externo

- **v1:** Opcional
- **Estado:** Pendiente
- **Bloqueada por:** T-401
- **Descripción:** como mantenedor, quiero ver a otra persona migrar sin ayuda, porque hasta ahora solo hay evidencia de una migración propia.
- **Criterios de aceptación:**
  - Al menos un dev externo migra o crea una CLI con la documentación pública.
  - Sus problemas quedan registrados con sus palabras, sin resumir.

### T-209 Lo que sobra después de `--` no se pierde

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que usa una CLI, quiero un error si paso algo de más, y no que se ignore. qr-plus necesita 5 líneas propias para que `qr-plus a -- b` no genere el QR de `a` y descarte `b`.
- **Criterios de aceptación:**
  - Un comando que no pidió `rest` rechaza lo que sobra después de `--`, con exit 2 y el `Run '<cli> --help' for usage.` de los demás errores.
  - Un comando que envuelve a otro sigue recibiendo esos tokens, con `rest: true`.
  - qr-plus puede borrar su validación propia.

### T-210 Nombre del valor en la ayuda

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero mostrar `--dark-color <hex>` en vez de `--dark-color <string>`. qr-plus lo hacía con `hint`, que se eliminó.
- **Criterios de aceptación:**
  - `meta.options` acepta el nombre del valor, y la ayuda de `core` y del plugin lo muestran.
  - Sin declararlo, la ayuda sigue mostrando el tipo.

### T-211 Errores de uso desde un comando

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero rechazar una combinación de opciones desde `run()` con un error de uso. `CommandError` con exit 2 no agrega `Run '<cli> --help' for usage.`, y `ValidationError` pide issues de Zod. qr-plus lo necesitó para `-f terminal -o x.svg`.
- **Criterios de aceptación:**
  - Un comando lanza un error de uso con un mensaje, sin armar issues de Zod.
  - El error sale con exit 2 y la misma pista que los demás errores de uso.

### T-212 Lo que devuelve un comando llega a la terminal

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero que un mismo `run()` sirva a personas y agentes. Hoy lo devuelto llega a la tool pero no a la terminal, así que hay que imprimir y además devolver. Sin `output`, los tipos tampoco permiten devolver un valor, aunque el README de `mcp` lo documenta. Reúne F-01, F-02, F-11 y F-12 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Decisión:** [ADR-0042](./adr/0042-lo-devuelto-llega-a-la-terminal.md). Lo devuelto sale por stdout, con `format(result)` si existe; un comando con `format` recibe `--json`, y `format` no corre por MCP.
- **Criterios de aceptación:**
  - Un string sale tal cual, y otro valor como JSON, por stdout, con y sin `output`.
  - Con `format`, stdout muestra su resultado, y `--json` muestra el dato como JSON.
  - Un comando con `format` que devuelve `undefined` falla como error del autor.
  - Un comando que solo imprime se comporta igual que hoy.
  - Devolver un valor sin `output` compila, y `format` recibe el tipo de lo devuelto.
  - `format` no corre en una llamada MCP, y `--json` no aparece en la tool.
  - Declarar la opción `json` junto con `format` falla al arrancar.
  - La nota de migración muestra cómo pasar de imprimir y devolver a `format`.

### T-213 Nombre de los comandos

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero que el nombre que declaro sea el que se ejecuta. `meta.name` es obligatorio, pero en `defineCLI` manda la clave: `withOutput` se ejecuta como `withOutput`, aunque `darkColor` sea `--dark-color`. Es F-03 de [`local-beacon`](./research/2026-10-local-beacon-friction.md), y va contra [ADR-0029](./adr/0029-cada-campo-tiene-efecto.md).
- **Decisión:** [ADR-0043](./adr/0043-nombre-unico-de-comando.md). La clave es el nombre, sin conversión, en minúsculas, números y guiones.
- **Criterios de aceptación:**
  - `commands: { 'with-output': withOutput }` se ejecuta como `with-output`, con ese nombre en ayuda, completions, config y tool.
  - `commands: { withOutput }` falla al arrancar, e indica la forma correcta.
  - `meta.name` es opcional en un subcomando, y si no coincide con la clave, falla al arrancar.
  - `runCLI` sigue exigiendo `meta.name`.
  - Se comprueba una tool con guión con un cliente MCP real.
  - La nota de migración muestra el cambio.

### T-214 La ayuda de un subcomando muestra la CLI

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero copiar el uso que muestra la ayuda. Hoy `USAGE  envOption [options]` no se puede ejecutar. Es F-04 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - En `defineCLI`, el uso de un subcomando empieza con el nombre de la CLI, en `core` y en el plugin.
  - Un subcomando anidado muestra la ruta completa.
  - `fullPath` en `getSchema()` no cambia de significado.

### T-215 README y changelog en npm

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que evalúa Runa, quiero leer la documentación en npm y ver qué cambió. El campo `readme` del registro está vacío, y `CHANGELOG.md` no viaja en el paquete, aunque [`VERSIONING.md`](../VERSIONING.md) manda a leerlo. Son F-05 y F-10 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - Se confirma si la página de npm muestra el README, y por qué el registro lo tiene vacío.
  - Después de publicar, `npm view @runa-cmd/core readme` devuelve el README, en los cuatro paquetes.
  - Cada paquete publicado incluye su `CHANGELOG.md`.

### T-309 Fallos sin efecto por MCP

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor de una tool, quiero que un fallo previsto no le sugiera al modelo un efecto que no ocurrió. Hoy un `CommandError` devuelve `effect: "unknown"` y `safeToRetry: false`, aun en una tool con `readOnlyHint: true`. Es F-06 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Decisión:** [ADR-0044](./adr/0044-runa-no-opina-sobre-reintentos.md). Runa informa lo que ocurrió y no opina sobre reintentos: `safeToRetry` desaparece.
- **Criterios de aceptación:**
  - `_meta['runa/error']` tiene `class` y `effect`, sin `safeToRetry`.
  - Un `CommandError` llega con `effect: "unknown"` y solo el mensaje del autor.
  - Input inválido da "The command did not run.", lo ya terminado "The command already ran.", y un crash o una cancelación "The command did not finish.".
  - Ningún texto agregado por Runa menciona reintentos.
  - `readOnlyHint` no cambia la respuesta de error.
  - La nota de migración muestra el cambio para los clientes.

### T-216 Opción faltante con su variable de entorno

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero saber que una opción obligatoria también se puede dar por env. Es F-08 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - El error nombra la variable declarada, sin mostrar ningún valor.

### T-217 Valor por defecto legible en la ayuda

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero mostrar `~/.tool/control.sock` y no la ruta de mi home cuando el valor por defecto es calculado. Es F-13 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - `meta.options` acepta el texto del valor por defecto, y las dos ayudas lo muestran.
  - El valor real no cambia.

### T-218 Parada limpia de un servicio

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de un servicio, quiero que Ctrl+C no parezca un error si el comando terminó ordenadamente. Es F-07 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - Un comando que terminó bien tras la señal no imprime `Interrupted.`.
  - El exit code sigue siendo 130 o 143, porque es contrato.

### T-310 Valores fijos que no son secretos

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como quien opera un servidor, quiero que el modelo vea una ruta que no es secreta, y no `[redacted]`. Es F-14 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - Quien opera puede marcar una opción como no secreta.
  - Por defecto, nada cambia: redactar sigue siendo lo normal, como dice [ADR-0032](./adr/0032-postura-sobre-secretos.md).

### T-219 Las opciones globales leen el config

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero que un `store` en el config se respete, y no escribir en otro archivo sin enterarme. Hoy una global ignora el config sin aviso, aun con un tipo inválido, aunque `env` sí funciona. Es H1 de [la evaluación](./research/2026-10-first-use-evaluation.md), y va contra [ADR-0008](./adr/0008-config-merge-en-core.md).
- **Criterios de aceptación:**
  - Una global respeta CLI, env, config y default, igual que una opción de comando.
  - Un valor inválido en el config da exit 2.
  - Las globales de un plugin siguen la misma regla.

### T-220 Forma del archivo de config

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero dar un valor a un solo comando. Hoy una clave se aplica a toda opción con ese nombre: `{"force":true}` activa `--force`, una clave de `add` rompe `list`, y `{"clear":{...}}` se ignora sin aviso. Es H2 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Decisión:** [ADR-0040](./adr/0040-forma-del-archivo-de-config.md). La raíz tiene las globales y los comandos, anidados; lo desconocido es un error, y una global no puede llamarse como un comando.
- **Criterios de aceptación:**
  - `{"clear":{"force":true}}` afecta a `clear`, y `{"tag":{"add":{...}}}` a `tag add`.
  - Una clave de un comando no cambia a otro comando.
  - Una clave desconocida da exit 2, y nombra el archivo y la clave. `$schema` se acepta.
  - Una global con el nombre de un comando falla al arrancar, si la CLI declara `config`.
  - Un error de valor nombra el archivo y la clave, y un JSON roto es un error del archivo, no `Unexpected error`.
  - Por MCP, un valor del config solo fija la opción de ese comando (H9).
  - `VERSIONING.md` y los README documentan la forma, y una nota de migración muestra el cambio.

### T-221 Probar una CLI sin subproceso

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero probar mis comandos sin que un error termine el runner. Hoy `cli.run()` llama a `process.exit`, devuelve `undefined`, y no se pueden capturar stdout, stderr ni el exit code. Son H4 y F-09.
- **Decisión:** [ADR-0041](./adr/0041-funcion-de-pruebas.md). Una función `testCLI()` envuelve la CLI y da más detalle que una ejecución normal.
- **Criterios de aceptación:**
  - Una prueba ejecuta un comando que falla y sigue corriendo.
  - La prueba lee el exit code, stdout, stderr y lo devuelto.
  - La prueba pasa variables y valores de config sin archivos ni parches.
  - Ante un fallo, la prueba lee el error original, y un registro de lo ocurrido.
  - `cleanup` corre igual que en una ejecución real.
  - No se pierden los resultados de `node --test` ni de Vitest.
  - Se comprueba si admite ejecuciones concurrentes, y el resultado queda documentado.
  - La guía de testing de T-503 la usa.

### T-222 Los posicionales convierten como las opciones

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero que un schema se comporte igual en opciones, argumentos y MCP. Hoy `args: { id: z.number() }` falla por CLI, y los tipos dicen `number`. Es H3 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - `z.number()` y `z.boolean()` en posicionales usan la coerción de [ADR-0013](./adr/0013-coercion-numerica.md).
  - Un variádico convierte cada elemento.
  - Un valor inválido da exit 2 con un mensaje como el de las opciones.

### T-223 Flag desconocida en la raíz

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero que `tool --bogus` diga que la opción no existe. Hoy da `Command not found` y 127. Como los exit codes son contrato, hay que corregirlo antes de la 1.0.
- **Criterios de aceptación:**
  - Una flag desconocida antes del comando da exit 2 y `Unknown option`.
  - Un comando desconocido sigue dando 127.

### T-224 Salida de ayuda sin estilos fuera de una terminal

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero que la ayuda en un pipe o con `NO_COLOR` no traiga códigos ANSI. Es H10 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - Hacia un pipe o con `NO_COLOR=1`, la ayuda del plugin no contiene secuencias ANSI, ni en negrita ni en tenue.
  - En una terminal, el estilo no cambia.

### T-225 Completions con eval y texto con símbolos

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero que el completado funcione como se sugiere. `eval "$(cli completions zsh)"` falla, y según el reporte un `]` en una descripción o un enum con espacio lo rompen. Son H7 y H8 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - La instalación que sugiere la CLI funciona en zsh, o deja de sugerirse.
  - Se reproduce H8, y los valores quedan escapados como promete el README.

### T-226 Ruta completa en hooks y middleware

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de un plugin, quiero distinguir `tag add` de `add`. Hoy `ctx.command.name` es solo la hoja, y el middleware no recibe el comando. Es H6 de [la evaluación](./research/2026-10-first-use-evaluation.md). Es aditivo, así que puede salir en 1.x.
- **Criterios de aceptación:**
  - Hooks y middleware reciben la ruta completa del comando.
  - `command.name` no cambia de significado.

### T-227 Detalles de ayuda y errores

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero mensajes uniformes y una ayuda sin ruido. Reúne los menores de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - Se contrasta cada menor, y lo confirmado se corrige o se descarta con motivo.
  - Un error de validación no expone a Zod ni la clave interna.
  - El ejemplo de Layer 3 de `help` compila (H5).

### T-208 Retirar el modo implícito

- **v1:** Requerido
- **Estado:** Pendiente
- **Bloqueada por:** T-404, porque cerrar T-208 abre la ventana de estabilidad, y un cambio incompatible la reiniciaría. Por el mismo motivo, también T-212, T-213, T-220, T-221, T-223 y T-309
- **Descripción:** como mantenedor, quiero que 1.0 no incluya el modo que depende de contar comandos y falla al sumar un plugin. El retiro cierra la etapa de cambios incompatibles previstos, antes de abrir la ventana de estabilidad.
- **Criterios de aceptación:**
  - `defineCLI` deja de saltear el nombre del comando cuando hay uno solo.
  - qr-plus ya usa `runCLI` antes de este cambio.
  - La nota de migración muestra el cambio, y sale en una beta posterior a T-402.

## Fase 6: contrato v1

### T-501 Criterio de estabilidad verificable

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de Runa, quiero saber qué condición habilita la 1.0, para que no dependa de una impresión.
- **Resultado:** [ADR-0038](./adr/0038-ventana-de-estabilidad.md). La ventana dura 4 semanas desde que se publica la beta con T-208, y cuenta el uso del proyecto de T-404 sobre una versión instalada desde npm. La 1.0 sale cuando la ventana se completa sin cambios incompatibles.
- **Criterios de aceptación:**
  - Queda escrita la duración de la ventana y qué uso real cuenta.
  - Un cambio incompatible en la API pública reinicia la ventana.
  - La condición se puede comprobar con el historial de cambios.

### T-502 Política de semver y deprecación

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como usuario de Runa, quiero saber qué se considera breaking y cuánto dura algo deprecado. La política está en [`VERSIONING.md`](../VERSIONING.md).
- **Criterios de aceptación:**
  - La política define si son contrato los tipos, exit codes, mensajes, salida de ayuda y nombres de tools MCP.
  - Define cómo se anuncia una deprecación y su duración mínima.
  - Se publica antes de 1.0.

### T-503 Documentación de v1

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como dev nuevo, quiero guías que me lleven de cero a una CLI y una tool MCP.
- **Criterios de aceptación:**
  - Hay guías de inicio, plugins, middleware, testing y MCP, además de referencia de API.
  - Hay una guía de migración desde commander, basada en qr-plus.
  - Se resuelven las contradicciones de [la evaluación](./research/2026-10-first-use-evaluation.md): `-h` propio, `db migrate --help`, `rawArgs`, y se documentan los variádicos y `ctx.invocation`.
  - Los ejemplos corren en CI o se verifican en cada release.

### T-504 Grupo de versiones de los paquetes

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como mantenedor, quiero decidir si los cuatro paquetes siguen versionándose juntos después de la 1.0.
- **Decisión:** [ADR-0039](./adr/0039-paquetes-independientes-desde-1-0.md). Siguen en el grupo `fixed` hasta publicar la 1.0.0, y después cada paquete tiene su versión. Así, un cambio en un plugin no publica un `core` sin cambios, ni le da una major falsa.
- **Criterios de aceptación:**
  - La decisión queda registrada con su condición de revisión.
  - La configuración de changesets la refleja: hasta la 1.0.0 no cambia, y T-506 vacía `fixed`.

### T-505 Trusted Publishing

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como mantenedor, quiero publicar desde CI sin tokens guardados, usando OIDC, la autenticación sin secretos de npm.
- **Decisión:** por ahora la publicación sigue siendo local, como dice [ADR-0016](./adr/0016-release-con-changesets.md). Publicar no se puede deshacer, y el mantenedor prefiere ejecutarlo a mano antes que arriesgar que un automatismo lleve algo que no corresponde.
- **Criterios de aceptación:**
  - Los cuatro paquetes tienen el publicador confiable configurado.
  - El workflow publica con `id-token: write`, sin `NPM_TOKEN`.
  - `CONTRIBUTING.md` describe el flujo, y el manual queda como respaldo hasta probarlo.

### T-506 Salir de pre-release y publicar 1.0.0

- **v1:** Requerido
- **Estado:** Pendiente
- **Bloqueada por:** todas las tareas requeridas
- **Descripción:** como usuario de Runa, quiero instalar 1.0.0 desde `latest`.
- **Criterios de aceptación:**
  - Se cumple el criterio de T-501.
  - Se ejecuta `changeset pre exit` y se amplían los peer ranges de help, MCP y completions.
  - Un dry-run de `changeset version` da las versiones esperadas antes de publicar.
  - Los cuatro paquetes quedan en `1.0.0` bajo `latest`, y la tabla del README dice `Stable`.
  - Después de publicar, `fixed` queda vacío en `.changeset/config.json`, como pide [ADR-0039](./adr/0039-paquetes-independientes-desde-1-0.md).

## Después de v1 o si llega a tiempo

Estas tareas son aditivas y pueden salir en 1.x.

### T-601 `ctx.stdin`

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de una CLI, quiero leer datos enviados por pipe desde `run()`.
- **Criterios de aceptación:**
  - `echo x | tool` expone esos datos en `ctx.stdin`.
  - Una terminal interactiva no queda esperando entrada.

### T-602 Ancho correcto para CJK y emoji

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como usuario de una CLI, quiero que las tablas sigan alineadas con caracteres anchos.
- **Criterios de aceptación:**
  - Las tablas se alinean con CJK y emoji.
  - La salida ASCII queda idéntica.
  - `@runa-cmd/help` sigue sin dependencias nuevas.

### T-603 Completions de rutas de archivo

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como usuario de una CLI, quiero autocompletar rutas en argumentos de archivo.
- **Criterios de aceptación:**
  - Bash, zsh y fish listan archivos para un parámetro marcado como ruta.

### T-604 `#RGB` en temas

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor de un tema, quiero usar la forma corta de un color.
- **Criterios de aceptación:**
  - `#F0A` equivale a `#FF00AA`.

## Fuera de alcance por ahora

Se retoman solo con un pedido real:

- **`defineCLI({ command })` y comando por defecto:** `runCLI` cubre el caso, y se pueden sumar después sin romper nada.
- **Alias corto `-V`:** no hay un estándar compartido.
- **Prompts y spinners:** sería una API nueva sin validar. Por ahora conviene documentar la integración con librerías existentes.
- **Loaders YAML y TOML:** son paquetes opcionales que no bloquean a `core`.
