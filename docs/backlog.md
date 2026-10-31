# Backlog de Runa hacia v1

**Dirección:** un comando, para personas y agentes. Un solo schema da el CLI, la ayuda, las completions y la tool MCP.

**Reglas para decidir cada cambio:**

- Sencillo por defecto, reemplazable siempre.
- El dev no escribe nada dos veces.
- No buscamos paridad con commander: lo básico se hace lo justo para que nadie abandone en los primeros cinco minutos.

**Criterio de v1:** la API pública no necesita cambios incompatibles durante una ventana sostenida de uso real. La ventana se define en T-501 y empieza a contar al cerrar T-208.

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
| 5. Validación | T-401 | Publicar la siguiente beta | Requerido | Pendiente |
| | T-402 | Revalidar qr-plus, CLI y MCP | Requerido | Pendiente |
| | T-403 | Migración de un dev externo | Opcional | Pendiente |
| | T-208 | Retirar el modo implícito | Requerido | Pendiente |
| 6. Contrato v1 | T-501 | Criterio de estabilidad verificable | Requerido | Pendiente |
| | T-502 | Política de semver y deprecación | Requerido | Pendiente |
| | T-503 | Documentación de v1 | Requerido | Pendiente |
| | T-504 | Grupo de versiones de los paquetes | Requerido | Decisión pendiente |
| | T-505 | Trusted Publishing | Requerido | Pendiente |
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
- **Estado:** Pendiente
- **Bloqueada por:** fases 1 a 4
- **Descripción:** como mantenedor, quiero publicar estos cambios bajo `beta`, para probarlos en un proyecto real. La publicación es manual.
- **Criterios de aceptación:**
  - La versión llega al dist-tag `beta`, y `latest` no cambia.
  - El changelog incluye una guía de migración con cada cambio de comportamiento.
  - Una instalación limpia corre el ejemplo del README.

### T-402 Revalidar qr-plus, CLI y MCP

- **v1:** Requerido
- **Estado:** Pendiente
- **Bloqueada por:** T-401
- **Descripción:** como mantenedor, quiero comprobar en un proyecto real que el trabajo resolvió el problema, antes de iniciar la ventana de estabilidad.
- **Criterios de aceptación:**
  - qr-plus borra los cinco workarounds sin cambiar su comportamiento.
  - Se registra cuántas líneas de setup quedan respecto de las 170 actuales.
  - `qr-plus --mcp` se usa desde un agente real, que recibe el resultado completo.
  - Toda fricción nueva entra en este backlog.

### T-403 Migración de un dev externo

- **v1:** Opcional
- **Estado:** Pendiente
- **Bloqueada por:** T-401
- **Descripción:** como mantenedor, quiero ver a otra persona migrar sin ayuda, porque hasta ahora solo hay evidencia de una migración propia.
- **Criterios de aceptación:**
  - Al menos un dev externo migra o crea una CLI con la documentación pública.
  - Sus problemas quedan registrados con sus palabras, sin resumir.

### T-208 Retirar el modo implícito

- **v1:** Requerido
- **Estado:** Pendiente
- **Bloqueada por:** T-402
- **Descripción:** como mantenedor, quiero que 1.0 no incluya el modo que depende de contar comandos y falla al sumar un plugin. El retiro cierra la etapa de cambios incompatibles previstos, antes de abrir la ventana de estabilidad.
- **Criterios de aceptación:**
  - `defineCLI` deja de saltear el nombre del comando cuando hay uno solo.
  - qr-plus ya usa `runCLI` antes de este cambio.
  - La nota de migración muestra el cambio, y sale en una beta posterior a T-402.

## Fase 6: contrato v1

### T-501 Criterio de estabilidad verificable

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como usuario de Runa, quiero saber qué condición habilita la 1.0, para que no dependa de una impresión.
- **Criterios de aceptación:**
  - Queda escrita la duración de la ventana y qué uso real cuenta.
  - Un cambio incompatible en la API pública reinicia la ventana.
  - La condición se puede comprobar con el historial de cambios.

### T-502 Política de semver y deprecación

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como usuario de Runa, quiero saber qué se considera breaking y cuánto dura algo deprecado.
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
  - Los ejemplos corren en CI o se verifican en cada release.

### T-504 Grupo de versiones de los paquetes

- **v1:** Requerido
- **Estado:** Decisión pendiente
- **Descripción:** como mantenedor, quiero decidir si los cuatro paquetes siguen versionándose juntos después de la 1.0.
- **Decisión:** mantener el grupo `fixed` o separarlo.
- **Criterios de aceptación:**
  - La decisión queda registrada con su condición de revisión.
  - La configuración de changesets la refleja.

### T-505 Trusted Publishing

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como mantenedor, quiero publicar desde CI sin tokens guardados, usando OIDC, la autenticación sin secretos de npm.
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
