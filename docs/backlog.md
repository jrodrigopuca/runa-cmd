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
| | T-308 | Comandos de plugins fuera de las tools | Requerido | Hecho |
| 4. Primer uso | T-204 | `--help` en `core`, reemplazable | Requerido | Hecho |
| | T-205 | Ruteo único para la ayuda | Requerido | Hecho |
| | T-206 | Kebab-case por defecto | Requerido | Hecho |
| | T-207 | Opciones repetidas con `z.array()` | Requerido | Hecho |
| 5. Validación | T-401 | Publicar la siguiente beta | Requerido | Hecho |
| | T-402 | Revalidar qr-plus | Requerido | Hecho |
| | T-404 | Usar MCP desde un agente real | Requerido | Hecho |
| | T-403 | Migración de un dev externo | Opcional | Pendiente |
| | T-209 | Lo que sobra después de `--` no se pierde | Requerido | Hecho |
| | T-210 | Nombre del valor en la ayuda | Requerido | Hecho |
| | T-211 | Errores de uso desde un comando | Opcional | Pendiente |
| | T-219 | Las opciones globales leen el config | Requerido | Hecho |
| | T-220 | Forma del archivo de config | Requerido | Hecho |
| | T-221 | Probar una CLI sin subproceso | Requerido | Hecho |
| | T-212 | Lo que devuelve un comando llega a la terminal | Requerido | Hecho |
| | T-222 | Los posicionales convierten como las opciones | Requerido | Hecho |
| | T-223 | Flag desconocida en la raíz | Requerido | Hecho |
| | T-224 | Salida de ayuda sin estilos fuera de una terminal | Requerido | Hecho |
| | T-225 | Completions con eval y texto con símbolos | Requerido | Hecho |
| | T-213 | Nombre de los comandos | Requerido | Hecho |
| | T-214 | La ayuda de un subcomando muestra la CLI | Requerido | Hecho |
| | T-215 | README y changelog en npm | Requerido | Hecho |
| | T-309 | Fallos sin efecto por MCP | Requerido | Hecho |
| | T-216 | Opción faltante con su variable de entorno | Opcional | Hecho |
| | T-217 | Valor por defecto legible en la ayuda | Opcional | Hecho |
| | T-218 | Parada limpia de un servicio | Opcional | Hecho |
| | T-310 | Valores fijos que no son secretos | Opcional | Descartado |
| | T-226 | Ruta completa en hooks y middleware | Opcional | Hecho |
| | T-227 | Detalles de ayuda y errores | Opcional | Hecho |
| | T-228 | `format` recibe las opciones | Opcional | Hecho |
| | T-229 | Ejecutar una CLI sin terminar el proceso | Opcional | Descartado |
| | T-230 | `testCLI()` y una CLI sin archivo de config | Opcional | Hecho |
| | T-231 | Middleware que no llama o no espera `next()` | Opcional | Hecho |
| | T-232 | Completions de un posicional enum | Opcional | Pendiente |
| | T-208 | Retirar el modo implícito | Requerido | Hecho |
| 6. Contrato v1 | T-501 | Criterio de estabilidad verificable | Requerido | Hecho |
| | T-502 | Política de semver y deprecación | Requerido | Hecho |
| | T-503 | Documentación de v1 | Requerido | Hecho |
| | T-504 | Grupo de versiones de los paquetes | Requerido | Hecho |
| | T-505 | Trusted Publishing | Opcional | Pendiente |
| | T-506 | Salir de pre-release y publicar 1.0.0 | Requerido | Pendiente |
| | T-507 | Referencia de API generada | Opcional | Pendiente |
| 7. Revisión antes de v1 | T-233 | Peer de `help` al día con lo que usa | Requerido | Hecho |
| | T-234 | Lista de códigos de error y clases de MCP | Requerido | Hecho |
| | T-235 | Errores del archivo de config | Requerido | Hecho |
| | T-236 | Errores de MCP por un valor del operador | Requerido | Hecho |
| | T-237 | `exitOnHelp` y ADR-0034 | Requerido | Hecho |
| | T-238 | Slots del tema que no tienen efecto | Requerido | Hecho |
| | T-239 | La CLI del generador sigue las reglas de Runa | Requerido | Pendiente |
| | T-240 | Completions de bash después de un posicional | Requerido | Pendiente |
| | T-241 | Opción enum obligatoria que falta | Requerido | Pendiente |
| | T-242 | Error de tipos engañoso sin `description` | Requerido | Pendiente |
| | T-243 | `help` como comando | Requerido | Pendiente |
| | T-244 | Alias mal escritos al arrancar | Requerido | Pendiente |
| | T-245 | Guías de comparación honestas | Requerido | Pendiente |
| | T-246 | El valor recibido en los errores | Opcional | Pendiente |
| | T-247 | Sugerir dónde va una clave del config | Opcional | Pendiente |
| | T-248 | Alias y env junto al schema | Opcional | Pendiente |
| | T-249 | Docs internas al día | Opcional | Pendiente |
| | T-250 | Detalles de coherencia | Opcional | Pendiente |
| Después | T-601 | `ctx.stdin` | Opcional | Pendiente |
| | T-602 | Ancho correcto para CJK y emoji | Opcional | Pendiente |
| | T-603 | Completions de rutas de archivo | Opcional | Pendiente |
| | T-604 | `#RGB` en temas | Opcional | Pendiente |
| | T-605 | Generador de proyectos | Opcional | Hecho |

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

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero que un agente no vea comandos que un plugin agregó para personas, sin tener que conocerlos para excluirlos. Es requerida porque un nombre de tool es contrato: sacarla después de la 1.0 exige una major.
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
- **Estado:** Hecho
- **Resultado:** con `opencode` y `qwen3.5:9b`, el modelo usó las tools en 24 de 24 corridas sin que se las nombraran, y ante un error nunca reintentó. Con la beta.5, una tool con guion funcionó en otro cliente, Claude Code con `claude-haiku-5-5`: 6 de 6 corridas la llamaron sin que el prompt la nombrara ([validación](./research/2026-11-local-beacon-beta5.md)). El detalle está en [la validación](./research/2026-11-local-beacon-real-model.md).
- **Descripción:** como mantenedor, quiero ver una CLI real usada por un agente real, porque qr-plus no usa MCP y hasta ahora solo hay pruebas con un cliente propio. La prueba la hace otro proyecto, y su agente solo ve lo publicado, para que no lo sesgue conocer Runa por dentro.
- **Avance:** `local-beacon` vigila la comunicación con un LLM externo, e informa si responde, si está bloqueado o si la máquina está sin conexión, para usar modelos locales desde dispositivos que no pueden correrlos. Adoptó `0.2.0-beta.2` y reportó 14 fricciones, [contrastadas](./research/2026-10-local-beacon-friction.md) y ya en este backlog. Falta comprobar que un modelo llame sus tools y qué hace ante un error.
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
- **Estado:** Hecho
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
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero que el nombre que declaro sea el que se ejecuta. `meta.name` es obligatorio, pero en `defineCLI` manda la clave: `withOutput` se ejecuta como `withOutput`, aunque `darkColor` sea `--dark-color`. Es F-03 de [`local-beacon`](./research/2026-10-local-beacon-friction.md), y va contra [ADR-0029](./adr/0029-cada-campo-tiene-efecto.md).
- **Decisión:** [ADR-0043](./adr/0043-nombre-unico-de-comando.md). La clave es el nombre, sin conversión, en minúsculas, números y guiones.
- **Criterios de aceptación:**
  - `commands: { 'with-output': withOutput }` se ejecuta como `with-output`, con ese nombre en ayuda, completions, config y tool.
  - `commands: { withOutput }` falla al arrancar, e indica la forma correcta.
  - `meta.name` es opcional en un subcomando, y si no coincide con la clave, falla al arrancar.
  - `runCLI` sigue exigiendo `meta.name`.
  - Se comprueba una tool con guión con el cliente oficial del SDK de MCP. Con la beta.5 se comprobó con un modelo real en Claude Code: aparece como `mcp__dash__list-tags` y se llama sin errores ([validación](./research/2026-11-local-beacon-beta5.md)). Falta una app de escritorio.
  - La nota de migración muestra el cambio.

### T-214 La ayuda de un subcomando muestra la CLI

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que usa una CLI, quiero copiar el uso que muestra la ayuda. Hoy `USAGE  envOption [options]` no se puede ejecutar. Es F-04 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Criterios de aceptación:**
  - En `defineCLI`, el uso de un subcomando empieza con el nombre de la CLI, en `core` y en el plugin.
  - Un subcomando anidado muestra la ruta completa.
  - `fullPath` en `getSchema()` no cambia de significado.

### T-215 README y changelog en npm

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que evalúa Runa, quiero leer la documentación en npm y ver qué cambió. El campo `readme` del registro está vacío, y `CHANGELOG.md` no viaja en el paquete, aunque [`VERSIONING.md`](../VERSIONING.md) manda a leerlo. Son F-05 y F-10 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Resultado:** la página de npm muestra el README, y la publicación lo envía, [medido](./research/2026-11-readme-in-npm.md). Una beta no puede comprobar `npm view`, así que esa verificación pasó a T-506.
- **Criterios de aceptación:**
  - Se investiga por qué el registro tiene `readme` vacío, y queda escrito qué se sabe y qué no.
  - Cada paquete publicado incluye su `CHANGELOG.md`.

### T-309 Fallos sin efecto por MCP

- **v1:** Requerido
- **Estado:** Hecho
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
- **Estado:** Hecho
- **Resultado:** `Missing required option: --database, or set TOOL_DATABASE_URL`, en opciones de comando y globales. El mensaje empieza igual que antes, y el texto de los errores no es contrato ([VERSIONING.md](../VERSIONING.md)). Por MCP, el error le dice a quien opera qué variable falta y no repite lo que mandó el modelo.
- **Descripción:** como persona que usa una CLI, quiero saber que una opción obligatoria también se puede dar por env. Es F-08 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Avance:** el 2026-11-08, commander 15.0.0 tampoco nombra la variable en el error (`required option '--token <token>' not specified`), y los dos la muestran en la ayuda (`[env: API_TOKEN]` en Runa). Sirve más con MCP: ahí la opción es de quien opera ([ADR-0032](./adr/0032-postura-sobre-secretos.md)), y el error le dice qué variable falta.
- **Criterios de aceptación:**
  - El error nombra la variable declarada, sin mostrar ningún valor.

### T-217 Valor por defecto legible en la ayuda

- **v1:** Opcional
- **Estado:** Hecho
- **Decisión:** `meta.options.<clave>.defaultDescription`, el nombre de yargs para lo mismo; commander lo pasa como segundo argumento de `.default()`. Vale también en `globalMeta`. Lo que no es la ayuda no cambia: el comando recibe el valor real, y el schema MCP sale de Zod.
- **Descripción:** como autor de una CLI, quiero mostrar `~/.tool/control.sock` y no la ruta de mi home cuando el valor por defecto es calculado. Es F-13 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Avance:** el 2026-11-08, commander 15.0.0 lo resuelve con `new Option(...).default(valor, '~/.beacon/control.sock')`: la ayuda muestra el texto y el comando recibe el valor. Runa muestra `(default: /Users/juan/.beacon/control.sock)`.
- **Criterios de aceptación:**
  - `meta.options` acepta el texto del valor por defecto, y las dos ayudas lo muestran.
  - El valor real no cambia.

### T-218 Parada limpia de un servicio

- **v1:** Opcional
- **Estado:** Hecho
- **Decisión:** [ADR-0046](./adr/0046-una-parada-termina-por-la-senal.md). En Unix, después del cleanup, el proceso se reenvía la señal en vez de llamar a `exit(130)` o `exit(143)`; si `run()` terminó bien después de la señal, no es un error.
- **Resultado:** en CI, en Ubuntu con systemd, `packages/core/src/__tests__/acceptance/systemd.test.ts` pasó sus 3 casos el 2026-11-08 (run `42502103251`): el control que sale con `exit(143)` queda `failed` tras `systemctl stop`, como dice la documentación de systemd, y un servicio de Runa no, tanto si `run()` termina bien como si falla por el aborto. Corre en cada push con `RUNA_REQUIRE_SYSTEMD`. Con la beta.6 instalada desde npm, `local-beacon` confirmó en launchd que `Interrupted.` ya no aparece: `last terminating signal = Terminated: 15`, `bootout` para sin reinicio y con cleanup, y la shell ve 143.
- **No fue aditivo:** `local-beacon` tenía dos tests y un script que lanzan `lbeacon proxy` con `spawn` y esperaban `code === 130`; con la beta.6 llega `code: null, signal: 'SIGINT'`, y tuvo que cambiar código. Se había decidido no reiniciar la ventana sobre la base de que no se conocía nadie que leyera `code` desde `spawn`, sin haberlo verificado en su código. El CHANGELOG del repo y el README de `core` ahora lo marcan como incompatible para ese caso, con el arreglo: `code ?? 128 + os.constants.signals[signal]`.
- **Descripción:** como autor de un servicio, quiero que Ctrl+C no parezca un error si el comando terminó ordenadamente. Es F-07 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Avance:** el 2026-11-08, el mismo servicio con commander 15.0.0 termina con exit 0 y nada en stderr: commander no maneja señales, y el autor escucha `SIGINT`. Con Runa termina con 130 e `Interrupted.`, aunque el comando terminó bien. `local-beacon` midió lo mismo con `SIGTERM` enviado a propósito, con el binario instalado de la beta.4: exit 143 a los 10 ms, `cleanup` corrió y borró el socket, y stderr dice `Interrupted.`, que es engañoso para un servicio que se detiene a propósito.
- **Antes de decidir:** hay que comprobar si el exit 143 que hoy es contrato le sirve a un servicio. Hipótesis, sin verificar: systemd toma como parada limpia un proceso que muere por la señal `SIGTERM`, pero no uno que sale con el código 143, salvo con `SuccessExitStatus=143`; si es así, un servicio de Runa que para bien queda como `failed`. launchd, en macOS, puede tener otra regla. `local-beacon` no sirve para probarlo: lanza `lbeacon proxy` a mano, sin systemd ni launchd. Se prueba con una beta y una CLI de ejemplo con un servicio, en Linux con systemd y en macOS con un LaunchAgent: se detiene con `systemctl stop` y `launchctl`, y se mira el estado que queda.
- **launchd, medido por `local-beacon` con la beta.5 en macOS 27.0.1:** `lbeacon proxy` como LaunchAgent, detenido con `launchctl kill`. Sin `KeepAlive`, launchd registra `last exit code = 143` con SIGTERM y 130 con SIGINT, y no reinicia. Con `KeepAlive` → `SuccessfulExit: false`, que significa "reiniciá solo si falla", la parada con SIGTERM sale con 143 y **launchd lo reinicia en menos de 5 s**: el servicio no se puede parar desde afuera. Un proceso de control que sale con 0, con la misma configuración, no se reinicia. `cleanup` corrió en todos los casos, y `Interrupted.` aparece en el log de stderr.
- **systemd, por su documentación:** cuenta como limpio el exit 0 o la muerte por SIGHUP, SIGINT, SIGTERM o SIGPIPE, y `systemctl stop` manda SIGTERM. Un exit 143 no está en la lista, así que hoy un servicio que para bien quedaría `failed`. Es lectura de la documentación, sin un systemd real.
- **Medido en macOS:** si el proceso, después del cleanup, se reenvía la señal en vez de llamar a `process.exit(143)`, la shell ve el mismo `$?` = 143 y el padre ve `signal: 'SIGTERM'` en vez de `code: 143`. Falta saber si launchd con `SuccessfulExit: false` reinicia también a un proceso muerto por la señal.
- **launchd, medido el 2026-11-08 en macOS 27.0.1,** con un script de Node sin Runa como LaunchAgent temporal, con `KeepAlive` → `SuccessfulExit: false`, en tres variantes: `exit(143)`, reenviar la señal y `exit(0)`. Con `launchctl kill SIGTERM`, launchd reinicia tanto la de `exit(143)` como la que muere por la señal (`last terminating signal = Terminated: 15`); solo `exit(0)` queda parada. Con `launchctl bootout`, la forma de launchd de detener un servicio, las tres paran sin reinicio y con cleanup, incluida la de hoy. Conclusión: en launchd no hay un bug de Runa. `kill` solo manda una señal, y con esa configuración cualquier daemon que muere por SIGTERM se reinicia; reenviar la señal se comporta como un daemon común. Para `local-beacon`, la forma de parar el LaunchAgent es `bootout`. Si la hipótesis se confirma, cambiar el exit code de una parada limpia es incompatible y va antes de la 1.0.
- **Criterios de aceptación:**
  - Un comando que terminó bien tras la señal no imprime `Interrupted.`.
  - El exit code sigue siendo 130 o 143, porque es contrato.

### T-310 Valores fijos que no son secretos

- **v1:** Opcional
- **Estado:** Descartado
- **Motivo del descarte:** con la beta.5, `local-beacon` midió 6 corridas con la ruta redactada y 6 con la ruta visible, con un modelo real: en las dos, 6 de 6 usaron la tool, ninguna reintentó y 5 de 6 interpretaron bien el error. La redacción no le cuesta nada al modelo, así que no hace falta marcar opciones como no secretas. Además, `[redacted]` solo aparece en el error con el proxy apagado. El detalle está en [la validación de la beta.5](./research/2026-11-local-beacon-beta5.md). Se reabre si un caso real muestra que la redacción le quita al modelo algo que necesita.
- **Descripción:** como quien opera un servidor, quiero que el modelo vea una ruta que no es secreta, y no `[redacted]`. Es F-14 de [`local-beacon`](./research/2026-10-local-beacon-friction.md).
- **Avance:** no hay con qué compararlo: commander, yargs, citty y cac no tienen MCP ni un concepto de secreto ([ADR-0032](./adr/0032-postura-sobre-secretos.md)).
- **Antes de decidir:** se prueba con una beta qué pierde el modelo hoy. Con `local-beacon`, `LBEACON_SOCKET` fijado y `tools/call status`, se mira si `no proxy on [redacted]` le impide al modelo responder o lo lleva a reintentar, con el mismo método que la [validación con un modelo real](./research/2026-11-local-beacon-real-model.md). Si el modelo responde bien igual, la tarea se cierra sin cambios.
- **Criterios de aceptación:**
  - Quien opera puede marcar una opción como no secreta.
  - Por defecto, nada cambia: redactar sigue siendo lo normal, como dice [ADR-0032](./adr/0032-postura-sobre-secretos.md).

### T-219 Las opciones globales leen el config

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que usa una CLI, quiero que un `store` en el config se respete, y no escribir en otro archivo sin enterarme. Hoy una global ignora el config sin aviso, aun con un tipo inválido, aunque `env` sí funciona. Es H1 de [la evaluación](./research/2026-10-first-use-evaluation.md), y va contra [ADR-0008](./adr/0008-config-merge-en-core.md).
- **Criterios de aceptación:**
  - Una global respeta CLI, env, config y default, igual que una opción de comando.
  - Un valor inválido en el config da exit 2.
  - Las globales de un plugin siguen la misma regla, salvo que declaren `configurable: false`.
  - Un archivo no puede iniciar el servidor MCP.

### T-220 Forma del archivo de config

- **v1:** Requerido
- **Estado:** Hecho
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
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero probar mis comandos sin que un error termine el runner. Hoy `cli.run()` llama a `process.exit`, devuelve `undefined`, y no se pueden capturar stdout, stderr ni el exit code. Son H4 y F-09.
- **Decisión:** [ADR-0041](./adr/0041-funcion-de-pruebas.md). Una función `testCLI()` envuelve la CLI y da más detalle que una ejecución normal. Un [experimento](./research/2026-10-testcli-capture-spike.md) confirmó que puede admitir ejecuciones concurrentes.
- **Criterios de aceptación:**
  - Una prueba ejecuta un comando que falla y sigue corriendo.
  - La prueba lee el exit code, stdout, stderr y lo devuelto.
  - La prueba pasa variables y valores de config sin archivos ni parches.
  - Ante un fallo, la prueba lee el error original, y un registro de lo ocurrido.
  - El registro dice de dónde salió cada valor, qué hooks corrieron y cuánto tardaron, y la salida en orden, según [ADR-0045](./adr/0045-registro-de-la-ejecucion.md).
  - Un valor de `env` nunca aparece en el registro, y `RUNA_DEBUG=1` no imprime ningún valor.
  - `RUNA_DEBUG=1` muestra el registro por stderr mientras ocurre.
  - `cleanup` corre igual que en una ejecución real.
  - No se pierden los resultados de `node --test` ni de Vitest.
  - Admite ejecuciones concurrentes en un proceso, sin `MaxListenersExceededWarning` y capturando `console` con Vitest.
  - Un `process.exit` dentro de un comando termina el comando y devuelve su código.
  - La guía de testing de T-503 la usa.

### T-222 Los posicionales convierten como las opciones

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero que un schema se comporte igual en opciones, argumentos y MCP. Hoy `args: { id: z.number() }` falla por CLI, y los tipos dicen `number`. Es H3 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - `z.number()` y `z.boolean()` en posicionales usan la coerción de [ADR-0013](./adr/0013-coercion-numerica.md).
  - Un variádico convierte cada elemento.
  - Un valor inválido da exit 2 con un mensaje como el de las opciones.

### T-223 Flag desconocida en la raíz

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que usa una CLI, quiero que `tool --bogus` diga que la opción no existe. Hoy da `Command not found` y 127. Como los exit codes son contrato, hay que corregirlo antes de la 1.0.
- **Criterios de aceptación:**
  - Una flag desconocida antes del comando da exit 2 y `Unknown option`.
  - Un comando desconocido sigue dando 127.

### T-224 Salida de ayuda sin estilos fuera de una terminal

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que usa una CLI, quiero que la ayuda en un pipe o con `NO_COLOR` no traiga códigos ANSI. Es H10 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - Hacia un pipe o con `NO_COLOR=1`, la ayuda del plugin no contiene secuencias ANSI, ni en negrita ni en tenue.
  - En una terminal, el estilo no cambia.

### T-225 Completions con eval y texto con símbolos

- **v1:** Requerido
- **Estado:** Hecho
- **Resultado:** probado en CI con bash, zsh y fish reales, con TAB de verdad en zsh. Si falta un shell en CI, la prueba falla en vez de omitirse.
- **Descripción:** como persona que usa una CLI, quiero que el completado funcione como se sugiere. `eval "$(cli completions zsh)"` fallaba, y un `]` en una descripción o un enum con espacio lo rompían: zsh llegaba a ejecutar parte de la descripción como comando. Son H7 y H8 de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Criterios de aceptación:**
  - La instalación que sugiere la CLI funciona en zsh, o deja de sugerirse.
  - Se reproduce H8, y los valores quedan escapados como promete el README.
  - CI comprueba los scripts generados con cada shell real: `bash -n`, `zsh -n` y `fish -n`, en el job de Linux. Fish nunca se probó: en la máquina de desarrollo no está instalado, y hoy solo se verifica el texto generado.

### T-226 Ruta completa en hooks y middleware

- **v1:** Opcional
- **Estado:** Hecho
- **Resultado:** `command.path` llega a hooks, middleware y `run()`, y el middleware recibe `command`. Es aditivo, así que no reinicia la ventana.
- **Descripción:** como autor de un plugin, quiero distinguir `tag add` de `add`. Hoy `ctx.command.name` es solo la hoja, y el middleware no recibe el comando. Es H6 de [la evaluación](./research/2026-10-first-use-evaluation.md). Es aditivo, así que puede salir en 1.x.
- **Criterios de aceptación:**
  - Hooks y middleware reciben la ruta completa del comando.
  - `command.name` no cambia de significado.

### T-227 Detalles de ayuda y errores

- **v1:** Opcional
- **Estado:** Hecho
- **Descripción:** como persona que usa una CLI, quiero mensajes uniformes y una ayuda sin ruido. Reúne los menores de [la evaluación](./research/2026-10-first-use-evaluation.md).
- **Avance:** contrastados el 2026-11-08 sobre el código de la beta.5, y contra commander 15.0.0:
  - **Se descartan, con motivo:** `nada` sugiere `add` y `-t=a` guarda `=a`. commander hace lo mismo en los dos casos, y `util.parseArgs` de Node también guarda `=a`: lo que sigue a una flag corta es su valor, como en POSIX.
  - **Siguen:** `--limit 0` da `limit: Too small: expected number to be >0`. Las completions de zsh ofrecen `--no-help`, `--no-version` y también `--no-mcp`. La ayuda de cada comando lista `--mcp` y `--version`, que solo tienen sentido en la raíz; esto último lo reportó `local-beacon` con la beta.3 y no estaba en la lista.
- **Resueltos el 2026-11-08,** medidos con el código actual, cada uno con su prueba:
  - **El ejemplo de Layer 3 del README de `help` no compilaba (H5):** usaba `schema.meta` y `schema.commands`, que no existen en la ayuda de un comando. Ahora es `examples/custom-help`, con typecheck y pruebas, delega la ayuda de un comando en `defaultRenderer`, y `docs:check` compara los bloques de los READMEs de los paquetes con sus archivos. Al probarlo apareció que `bold()` escribe ANSI aunque la salida no lo muestre; el ejemplo usa `styled()`, que sí lo respeta.
  - **Un booleano con default `true` no decía cómo apagarlo:** las dos ayudas lo muestran como `--[no-]cache`, la convención de oclif.
  - **Una regla de Zod mostraba la clave interna y el texto de Zod:** `--limit 0` da `Invalid value for --limit: must be greater than 0`. Los rangos de números, textos y listas se dicen con palabras; cualquier otra regla nombra el flag y conserva su mensaje, y un mensaje del autor que ya lo nombra queda igual. Vale también para posicionales.
  - **Una lista con default vacío mostraba `(default: )`:** las dos ayudas lo omiten.
  - **Las completions ofrecían `--no-` para todo booleano:** bash, zsh y fish lo ofrecen solo para uno con default `true`, así que desaparecen `--no-help`, `--no-version` y `--no-mcp`, y queda `--no-cache`.
- **Pendientes, opcionales:** `--mcp` y `--version` en la ayuda de cada comando; los valores de un posicional enum en las completions, que no aparecen; la ayuda de `core` no muestra esos valores, y el plugin sí; y `bold()`, `fg()` y los demás códigos de `help` escriben ANSI sin mirar la salida.
- **Análisis de impacto de los cuatro pendientes, 2026-11-08,** hecho por el agente de producto, que corrió las pruebas y leyó el código; lo central se volvió a comprobar. `gh` separa las opciones heredadas en `INHERITED FLAGS`, y `cargo build --help` no muestra `--version`. La prueba de qr-plus "--help and --version" exige los dos en su ayuda, que con `runCLI` es la de la raíz. De ahí salió también que el error de un subcomando mandaba a `Run 'tool --help'`, y no a la ayuda del comando.
- **Resueltos el 2026-11-08, segunda tanda:**
  - **`--mcp`, `--help` y `--version` en la ayuda de cada comando:** van aparte, bajo `GLOBAL OPTIONS`, en las dos ayudas, porque funcionan ahí y esconderlos callaría flags que sirven. `OptionSchema` suma `inherited`, opcional, así que un renderer propio sigue recibiendo todas las opciones. Con `runCLI` el comando es la CLI, y siguen en `OPTIONS`: se comprobó con una CLI de la forma de qr-plus.
  - **El error de un subcomando manda a su ayuda:** `tool build --limit 0` termina con `Run 'tool build --help' for usage.`; sin comando encontrado, o con `runCLI`, sigue siendo la de la CLI.
  - **La ayuda de `core` muestra los valores de un posicional enum:** `target  What to build for (web | node)`, como el plugin.
  - **`bold()`, `fg()` y los demás:** se documentó en su JSDoc y en el README que escriben ANSI siempre, y que `styled()` respeta la salida. No se cambió su comportamiento: es un export público, y lo que hace en la 1.0 queda fijo.
- **Queda fuera:** las completions de un posicional enum pasan a [T-232](#t-232-completions-de-un-posicional-enum), para 1.x.
- **Criterios de aceptación:**
  - Se contrasta cada menor, y lo confirmado se corrige o se descarta con motivo.
  - Un error de validación no expone a Zod ni la clave interna.
  - El ejemplo de Layer 3 de `help` compila (H5).

### T-228 `format` recibe las opciones

- **v1:** Opcional
- **Estado:** Hecho
- **Descripción:** como autor de una CLI, quiero que una opción que solo cambia cómo se muestra el resultado, como `--no-truncate`, no tenga que viajar en lo devuelto. Hoy llega también al modelo y a `--json`. Es N1 de [la validación](./research/2026-11-local-beacon-real-model.md).
- **Decisión:** `format(result, { args, options })`. Es aditivo: una función de un parámetro sigue funcionando.
- **Criterios de aceptación:**
  - `format` lee las opciones y los argumentos del comando, con sus tipos.
  - `format(result)` sigue funcionando.
  - Lo que recibe una tool no cambia.

### T-229 Ejecutar una CLI sin terminar el proceso

- **v1:** Opcional
- **Estado:** Descartado
- **Descripción:** como autor de un programa que embebe una CLI, quiero ejecutarla y recibir su resultado, sin que un error termine mi proceso. `cli.run()` llama a `process.exit`, y `testCLI()` resuelve las pruebas, no este caso. Es H4 de [la evaluación](./research/2026-10-first-use-evaluation.md), reportado de nuevo con `0.2.0-beta.4`. Es aditivo, así que puede salir en 1.x, y [ADR-0041](./adr/0041-funcion-de-pruebas.md) ya lo anticipó como opción.
- **Avance:** revisado el 2026-11-08. No hay un programa que embeba una CLI: `local-beacon` arranca con `cli.run()` y prueba con `testCLI()`, y su reporte de la beta.3 lo anota desde `node verify.ts nope`, un script que vuelve a chequear H4. La condición de ADR-0041, "si alguien integra una CLI dentro de un programa", no se cumple. commander lo resuelve con `exitOverride()`, que lanza un error con `exitCode` en vez de terminar: es el camino a mirar cuando aparezca el caso.
- **Motivo del descarte:** consultado el 2026-11-08, `local-beacon` confirmó que no tiene ni prevé un programa que ejecute la CLI desde adentro: H4 fue una hipótesis suya, y sus scripts corren `lbeacon` como subproceso. Se documentó en el README de `core` que `cli.run()` y `runCLI()` son el punto de entrada de un proceso, y que `testCLI()` es para tests. Se reabre con un caso real y el código que se quiere escribir.
- **Criterios de aceptación:**
  - Un programa ejecuta la CLI y recibe el exit code y lo devuelto, sin que el proceso termine.
  - `run()` sigue terminando el proceso, como hasta ahora.

### T-230 `testCLI()` y una CLI sin archivo de config

- **v1:** Opcional
- **Estado:** Hecho
- **Decisión:** fallar con un mensaje que diga qué arreglar. El mantenedor, el 2026-11-08: "siempre debemos avisar, no me gustan las cosas que fallan silenciosamente". Un solo comando no se puede comprobar, porque su archivo depende de `runCLI(command, { config })`: ahí `config` sigue representando ese archivo, y la guía lo dice.
- **Resultado:** `testCLI()` rechaza con `testCLI() got config, but 'ship' reads no config file: add config: { name: 'ship' } to defineCLI, or drop config from the test.` En `examples/testing`, sacar `config` de `defineCLI` ahora hace fallar las dos pruebas que usan config, con ese mensaje; antes pasaban. Ningún usuario conocido le pasa `config` a `testCLI()`: se revisó el código de `local-beacon` y de qr-plus.
- **Descripción:** como autor de una CLI, quiero que una prueba con `config` falle si mi CLI no lee ningún archivo, para no descubrirlo en producción. `testCLI()` aplicaba los valores igual. Apareció al escribir la guía de testing, cuando quitar `config` de `defineCLI` no hizo fallar ninguna prueba de `testCLI()`.
- **Opciones:**
  - Fallar con un mensaje que diga que la CLI no declara `config`. Es lo más claro, pero una prueba que hoy pasa empieza a fallar.
  - Ignorar `config`, como el programa real. Fiel, pero en silencio: el autor no sabe por qué no se aplica.
  - Dejarlo, y documentar que solo una ejecución real prueba que el archivo se lee.
- **Criterios de aceptación:**
  - Una prueba con `config` sobre una CLI que no lo declara no pasa en silencio.
  - Lo decidido queda en la guía de testing.

### T-231 Middleware que no llama o no espera `next()`

- **v1:** Opcional
- **Estado:** Hecho
- **Descripción:** como autor de un middleware, quiero enterarme si me olvidé `next()` o su `await`, en vez de descubrirlo en producción. Apareció al preparar la guía de plugins, midiendo el 2026-11-08: sin `next()`, el comando no corría, no se imprimía nada y la CLI salía con 0, con `afterRun` como si todo hubiera salido bien; sin `await`, `afterRun` y `cleanup` corrían mientras el comando seguía trabajando, y el resultado salía después del cleanup.
- **Decisión:** fallar en los dos casos, por la regla del mantenedor de no fallar en silencio. Saltear un comando a propósito, como un `--dry-run`, se escribe lanzando `CommandError` con `exitCode: 0`, que se comprobó que funciona. Ni `local-beacon` ni qr-plus usan middleware.
- **Resultado:** `MIDDLEWARE_DID_NOT_CALL_NEXT` y `MIDDLEWARE_DID_NOT_AWAIT_NEXT`, con exit 1 y un mensaje que dice qué hacer. Sin `await`, Runa espera a que el comando termine antes de `afterRun` y `cleanup`, y su error queda como `cause`; `RunaError` acepta `cause` para eso. Por MCP, el caso sin `next()` pasa de `class: 'not_run'` a `'rejected'`, con el mismo `effect: 'none'` y un texto que dice la causa. Probado en `middleware-next.test.ts` con `testCLI()`, y en las pruebas de MCP.
- **Criterios de aceptación:**
  - Un middleware sin `next()` hace fallar la corrida, y el mensaje dice que el comando no corrió.
  - Un middleware sin `await` no deja correr `afterRun` ni `cleanup` antes de que el comando termine.
  - Lanzar un error sigue siendo la forma de frenar un comando, también con exit 0.

### T-232 Completions de un posicional enum

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI con completions, quiero que TAB me ofrezca los valores de un argumento que solo acepta algunos, como `tool build <TAB>` con `web node`. Hoy los generadores de bash, zsh y fish solo completan opciones, no posicionales. El caso más visible es del propio plugin: `tool completions <TAB>` no ofrece `bash zsh fish`. Sale de T-227.
- **Por qué en 1.x:** es una comodidad aditiva, el error de un valor inválido ya lista los válidos, y ningún usuario conocido tiene un posicional enum ni usa las completions. Lo propuso el análisis de impacto del 2026-11-08.
- **Criterios de aceptación:**
  - En bash, zsh y fish, TAB ofrece los valores de un posicional enum en su posición.
  - `tool completions <TAB>` ofrece `bash zsh fish`.
  - Lo prueban los tests con shells reales de `shells.test.ts`.

### T-208 Retirar el modo implícito

- **v1:** Requerido
- **Estado:** Hecho
- **Resultado:** `defineCLI` siempre necesita el nombre del comando. La ventana de estabilidad empieza cuando se publique la beta que lo incluye.
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
- **Estado:** Hecho
- **Descripción:** como dev nuevo, quiero guías que me lleven de cero a una CLI y una tool MCP.
- **Cómo:** las guías están en inglés, en `guides/`, porque son para usuarios. Cada bloque de código que muestran es un archivo de un proyecto en `examples/`, que corre sus pruebas en CI, y `docs:check` falla si el bloque y el archivo difieren.
- **Avance:** guía de inicio; [comparación con otras herramientas](../guides/runa-compared.md), que cumple el último criterio; y [migración desde commander](../guides/migrate-from-commander.md), con `examples/from-commander`, que cumple el segundo. La tabla de lo que cambia para quien usa la CLI salió de correr la versión con commander 15.0.0 y la de Runa con los mismos argumentos, y coincide con la [guía de migración de qr-plus](https://github.com/jrodrigopuca/qr-code-generator/blob/master/docs/MIGRATION.md). Al escribirla apareció que el `tsconfig` de la guía de inicio, y por lo tanto el del generador, no compilaba un import de `node:`: TypeScript 6 ya no carga `@types/node` por su cuenta. Se agregó `"types": ["node"]` y una prueba en `@runa-cmd/create`. En esa guía, el código de Runa sale de `examples/getting-started`; el de commander, yargs, citty y cac se corrió una vez en las versiones que nombra, y no está en CI para no depender de releases ajenos. [Guía de MCP](../guides/mcp.md), con `examples/mcp-notes`: cubre el criterio del comando que no termina, con el caso de `local-beacon`, y que para un modelo solo cuenta el texto del error, porque `_meta` puede no llegarle. Sus pruebas hablan MCP con el cliente oficial del SDK, y se comprobó que fallan si se quita el `exclude` o el `env` de la opción del archivo. [Guía de testing](../guides/testing.md), con `examples/testing`, que cubre F-09 de `local-beacon`: cada una de sus pruebas se rompió a propósito y falló, y al hacerlo apareció un falso positivo de `testCLI()`, resuelto en T-230. [Guía de middleware y plugins](../guides/plugins.md), con `examples/plugins`: al prepararla apareció que un middleware sin `next()` o sin `await` fallaba en silencio, resuelto en T-231, y cada prueba del ejemplo se rompió a propósito y falló. La referencia de API queda en el JSDoc; la generada pasó a [T-507](#t-507-referencia-de-api-generada), opcional, por decisión del mantenedor del 2026-11-08, para que la 1.0 no dependa de cuándo TypeDoc soporte TypeScript 7.
- **Referencia de API, decidido el 2026-11-08:** primero JSDoc en los símbolos públicos, que hoy faltan en 185 de `core` (140 propiedades, 26 interfaces, 4 clases), y que se ven en el editor y en los `.d.ts` que lee un agente. La referencia se genera con TypeDoc cuando soporte TypeScript 7 ([TypeStrong/typedoc#3098](https://github.com/TypeStrong/typedoc/issues/3098)): probado con su propio TypeScript 6.0.3, genera 60 páginas de Markdown para `core` sin errores, pero hoy exige TS 6. Se espera en lugar de sumar `@typescript/typescript6` solo para esto. API Extractor queda descartado por ahora. **JSDoc, hecho el 2026-11-08:** `core`, `help`, `mcp` y `completions` quedan con 0 símbolos públicos sin documentar, según `typedoc --validation.notDocumented` (`core` tenía 185 y `help` 15). Los `.d.ts` y el JavaScript de `core`, comparados sin comentarios ni espacios antes y después, son idénticos. El JSDoc de `HookContext.rawArgs` resuelve la contradicción de la evaluación: en `beforeParse` es el argv completo; desde `onGlobalFlags`, solo la parte del comando; `run()` recibe el original. **Contradicciones de la evaluación, resueltas el 2026-11-08 y medidas con el código actual:** el README de `help` decía que un `-h` propio da `OPTION_COLLISION`, y que `db migrate --help` muestra la ayuda de `db`; ninguna de las dos es cierta, y se corrigieron. El README de `core` explica ahora qué tiene `ctx.rawArgs` en cada hook, y `ctx.invocation`, que `run()` no recibe a propósito ([ADR-0042](./adr/0042-lo-devuelto-llega-a-la-terminal.md)). Los variádicos ya estaban en "Positional arguments". El único aviso que quedó de TypeDoc era que `RunResult`, el tipo de lo que recibe `format`, aparecía en una firma pública sin exportarse; se exportó, con un type test que lo importa desde el paquete. **Revisar si:** sale un TypeDoc con TypeScript 7 en sus peers, o la referencia hace falta antes de que salga.
- **Criterios de aceptación:**
  - Hay guías de inicio, plugins, middleware, testing y MCP, además de referencia de API. Se cumple con el JSDoc de los cuatro paquetes; la referencia generada es T-507.
  - Hay una guía de migración desde commander, basada en qr-plus.
  - Se resuelven las contradicciones de [la evaluación](./research/2026-10-first-use-evaluation.md): `-h` propio, `db migrate --help`, `rawArgs`, y se documentan los variádicos y `ctx.invocation`.
  - Se explica lo que faltó en [la validación](./research/2026-11-local-beacon-real-model.md): `--json` imprime lo que devuelve `run()`, `testCLI()` necesita importar la CLI sin arrancarla, y para un modelo solo cuenta el texto del error: `_meta` puede no llegarle.
  - La guía de MCP explica qué hacer con un comando que no termina, como un servidor o un `watch`: una tool es un subproceso que tiene que terminar. `local-beacon` lo resuelve con `exclude: ['proxy', 'watch']`, y con `instructions` que le dicen al modelo que el proxy tiene que estar corriendo; confirmó el 2026-11-08 que es una decisión suya, sin fricción.
  - La guía de inicio explica cómo empaquetar una CLI: Node no ejecuta TypeScript dentro de `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), así que hay que compilar antes de publicar o instalar. Lo encontró `local-beacon` al instalarse global con `0.2.0-beta.4`.
  - Los ejemplos corren en CI o se verifican en cada release.
  - Una guía muestra cómo se arranca una CLI con Runa y con otras herramientas, con las diferencias bien marcadas, apoyada en [la comparación](./research/2026-11-ease-of-use.md). Se escribe después de T-605, para incluir el generador.

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
  - Después de `changeset pre exit`, Changesets pasa a la 3.x y el workflow de release a `changesets/action@v2`, que la requiere. No antes: en pre-release, la 3.0.3 descarta la lista de changesets ya publicados de `pre.json` y repite en el CHANGELOG de la beta siguiente todo lo publicado desde la primera beta (341 líneas de más en el de core, medido el 2026-11-08 corriendo `changeset version` con la 2.31.1 y con la 3.0.3 sobre el mismo commit).
  - Los cinco paquetes quedan en `1.0.0` bajo `latest`, y la tabla del README dice `Stable`.
  - Después de publicar, `fixed` queda vacío en `.changeset/config.json`, como pide [ADR-0039](./adr/0039-paquetes-independientes-desde-1-0.md).
  - Con los paquetes independientes, se decide cómo se mantiene al día el peer de `core` de cada plugin, que hasta acá va en lockstep (T-233). La opción anotada es probar cada plugin contra la versión más baja de su peer, instalada desde npm.
  - Después de publicar, `npm view @runa-cmd/core readme` devuelve el README, en los cinco paquetes. Si no, se aplica lo que dice [la investigación](./research/2026-11-readme-in-npm.md).

### T-507 Referencia de API generada

- **v1:** Opcional
- **Estado:** Pendiente
- **Bloqueada por:** un TypeDoc que soporte TypeScript 7 ([TypeStrong/typedoc#3098](https://github.com/TypeStrong/typedoc/issues/3098)). Su mantenedor apunta a la RC de TypeScript 7.1, del 2026-11-10, y una rama de un colaborador ya pasa sus pruebas sobre la beta de la 7.1.
- **Descripción:** como dev, quiero una referencia de cada tipo y función que pueda leer y enlazar fuera del editor. Sale de T-503, que la cumplió con el JSDoc: los cuatro paquetes tienen todos sus símbolos públicos documentados.
- **Decisión:** generarla con TypeDoc y su plugin de Markdown. Probado el 2026-11-08 con su propio TypeScript 6.0.3: 60 páginas para `core`, sin errores ni avisos. Se espera en lugar de sumar `@typescript/typescript6` solo para esto. API Extractor queda descartado por ahora. Es opcional para que la 1.0 no dependa del tiempo de otro proyecto.
- **Criterios de aceptación:**
  - La referencia se genera desde el código de los cuatro paquetes, sin sumar un TypeScript 6.
  - Los enlaces "Defined in" apuntan al repo, no a rutas locales ni a un commit fijo.
  - Las firmas no muestran internos de Zod, como `$ZodTypeInternals`.
  - CI falla si la referencia publicada queda desactualizada, o se genera en cada release.
- **Revisar si:** sale un TypeDoc con TypeScript 7 en sus peers, o la referencia hace falta antes de que salga.

## Fase 7: revisión antes de v1

Salen de [la revisión de coherencia y la comparación](./research/2026-11-review-before-v1.md) del 2026-11-08. El orden es el de prioridad: primero lo que destraba la beta.7, después las decisiones que tocan el contrato, que después de la 1.0 costarían una major, después los errores que ve cualquiera que empiece, y al final las guías. Todo es aditivo o una decisión que se toma ahora, así que hecho bien no reinicia la ventana. Cada tarea vuelve a reproducir su hallazgo antes de cambiar código.

### T-233 Peer de `help` al día con lo que usa

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como quien instala `@runa-cmd/help`, quiero que npm me avise si mi `core` es demasiado viejo, en vez de que una función no haga nada. El peer es `^0.2.0-beta.1`, pero el plugin usa `defaultDescription` (beta.5) e `inherited` (beta.7): con `core@0.2.0-beta.1` instala sin aviso y la ayuda muestra la ruta del home que `defaultDescription` existe para ocultar. Se cumple el "Revisar si" de [ADR-0039](./adr/0039-paquetes-independientes-desde-1-0.md), y al revisar la beta.5 se dijo que no hacía falta subirlo, contra lo que pide CONTRIBUTING.
- **Decisión, 2026-11-08:** hasta la 1.0, los pisos van en lockstep. Mientras los paquetes salen juntos, en el grupo `fixed`, el peer de `core` de cada plugin es la versión actual de `core`, y `docs:check` falla si no coinciden. Es automático y no depende de saber qué usa cada plugin. Se descartó probar cada plugin contra su piso, por ahora: cuesta más CI, y el piso de una beta todavía no existe en npm cuando se prueba. Un paso en la checklist ya existía y falló. Después de la 1.0 se revisa en T-506.
- **Criterios de aceptación:**
  - El peer de `core` de `help`, `mcp` y `completions` es la versión actual de `core`.
  - `docs:check` falla si un peer de `core` no coincide con su versión, mientras `fixed` agrupe a los paquetes.
  - CONTRIBUTING explica la regla.

### T-234 Lista de códigos de error y clases de MCP

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor que distingue errores por su `code`, como piden la guía de testing y VERSIONING.md, quiero saber cuáles existen. Son contrato, y hay 24 `code` en el código y 2 en la documentación; 10 `class` de MCP y 1 documentada, y `guides/mcp.md` remite a una lista que el README de `mcp` no tiene.
- **Decisión, 2026-11-08:** todos los `code` siguen siendo contrato, también los que salen al arrancar. Se descartó hacer informativos esos 15: lo que nada obliga a documentar se desactualiza. La lista pasa a ser código: constantes exportadas y un helper. Antes de fijarla se renombran los tres nombres que engañan o desentonan, y como un `code` es contrato, el mantenedor decidió reiniciar la ventana de estabilidad desde la beta que lo publique, la `0.2.0-beta.7`. Cuesta pocos días porque la ventana se había reiniciado ese mismo día. `VALIDATION_ERROR` y `COMMAND_ERROR` no cambian: son los que más se leen. El `code` solo llega a código JS (`onError`, `testCLI()`, plugins): ni stderr ni MCP lo muestran, porque MCP usa `class`.
- **Criterios de aceptación:**
  - `core` exporta `ERROR_CODES`, un objeto `as const` con cada uno de sus `code`, como `HOOK_NAMES` y `PARAM_TYPES`, y el tipo `ErrorCode`, y todo `RunaError` de `core` usa esas constantes.
  - `core` exporta `isRunaError(error, code?)`, que reconoce un `RunaError` por una marca con `Symbol.for`, no por `name`, que una subclase puede cambiar. Así funciona también con dos copias de `core` instaladas, donde `instanceof` falla. Acepta códigos propios, como los de un `CommandError`, sin perder el autocompletado de los de Runa.
  - `RunaError.code` sigue aceptando cualquier string.
  - `mcp` exporta sus propios `code` (`MCP_*`) y sus `class`, porque `core` no conoce a sus plugins.
  - Se renombra `CONFIG_INVALID` a `INVALID_CONFIG`. `OPTION_NAME` se divide: si dos opciones dan el mismo `--flag`, pasa a `OPTION_COLLISION`, el código que ya usa ese caso con las globales; si un booleano `noX` choca con `--no-x`, pasa a `INVALID_OPTION_NAME`.
  - El changeset marca los renombres como incompatibles, con el código viejo y el nuevo, y `docs/status.md` registra que la ventana se reinicia con la beta.7.
  - El README de `core` lista cada `code` con su exit code y cuándo sale, y el de `mcp` cada `class` con su `effect`.
  - `docs:check`, o una prueba, falla si las constantes y la lista de la documentación no coinciden.

### T-235 Errores del archivo de config

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que escribe el config de una CLI, quiero que un error en el archivo me diga siempre lo mismo: qué archivo, qué clave y qué está mal. Hoy un valor inválido es `ValidationError` con el texto de Zod y el hint de `--help`, una clave desconocida es `ConfigError` sin hint, y un JSON roto tiene un tercer formato. Además `"force": 1` se rechaza y `"force": "1"` no, contra [ADR-0028](./adr/0028-coercion-booleana.md).
- **Decisión, 2026-11-08:** el `code` dice qué falló, y el mensaje dice dónde. Un valor que no cumple el schema es `ValidationError` con `VALIDATION_ERROR`, venga de la terminal, de una variable de entorno o del archivo. Un archivo mal armado, sea un JSON roto, una clave que no existe o algo que no es un objeto, es `ConfigError` con `INVALID_CONFIG`. Se descartó usar un código según el origen: el mismo valor malo tendría dos códigos según de dónde venga. Si alguien necesita saber el origen, se suma de forma aditiva, sin renombrar.
- **Criterios de aceptación:**
  - La regla de los dos códigos está en el README de `core`, en la lista de T-234.
  - Los tres casos nombran el archivo y la clave con el mismo formato, y un valor inválido usa los mismos textos que la terminal (`must be greater than 0`).
  - La regla de los valores del archivo está en el README de `core`: cada valor puede ser su tipo JSON, o el mismo texto que se escribiría en la terminal, como `"5"` o `"true"`. Lo decidió el mantenedor el 2026-11-08, después de comparar: tsc 6.0.3 y Biome 2.6.4 rechazan `1`, `"1"` y `"true"`, y yargs 18 deja pasar el número `1` y convierte `"1"` en `false`, en silencio. Se mantiene el texto porque un loader de `config.loaders` puede producir solo texto, como un INI. No se acepta `1` como número: ninguna herramienta que valida lo acepta.
  - Un número donde va un booleano da un error que dice qué escribir, como `expected true or false`.

### T-236 Errores de MCP por un valor del operador

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como quien opera un servidor MCP, quiero que si falta un valor que solo yo puedo dar, el error no le diga al modelo que se equivocó él. Hoy da `class: invalid_input`. Además los errores de input nombran `--flag` y `<arg>`, que el modelo no ve, en lugar de las claves del schema, y un `Error` común tirado desde `run()` sale como `command_failed`, igual que un `CommandError`, contra el README de `mcp`.
- **Decisión, 2026-11-08:** se reprodujo con un cliente MCP real (SDK 1.32.2). Un valor del operador que falta tiene una clase nueva, `not_configured`, con `effect: none`, y además el servidor lo avisa al arrancar, para que el operador se entere antes de la primera llamada. Un `Error` común tirado desde `run()` pasa a `crashed`; `command_failed` queda solo para un `CommandError`, el error que el autor escribió. Así, un cliente puede distinguir un bug de una falla prevista. Este cambio de clase es incompatible y entra en la `0.2.0-beta.7`, que ya reinicia la ventana por T-234. La clase nueva es aditiva.
- **Criterios de aceptación:**
  - Si falta un valor que solo da el operador, como una opción con `env` fuera del schema de la tool, la llamada sale con `class: 'not_configured'` y `effect: 'none'`. El texto dice que el operador tiene que dar ese valor, para que el modelo no lo tome como un error suyo.
  - Si en la misma llamada también hay errores del modelo, la clase es `not_configured`, y el texto lista todo.
  - Al arrancar, el servidor escribe en stderr qué tools no van a poder correr y qué valor falta en cada una. No frena el servidor.
  - Un error de input que corrige el modelo nombra la clave del schema (`limit`, `title`), no `--limit` ni `<title>`. Las líneas para el operador siguen nombrando la flag y la variable.
  - Un `Error` común desde `run()` sale con `class: 'crashed'` y el texto de su `effect`; un `CommandError`, con `command_failed` y su mensaje tal como está.
  - El changeset marca el cambio de clase como incompatible, y el README de `mcp` lista cada `class` con su `effect` (T-234).

### T-237 `exitOnHelp` y ADR-0034

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como persona que corre una CLI sin comando, quiero exit 2, como dice [ADR-0034](./adr/0034-sin-nada-que-correr-es-un-error-de-uso.md), también si la CLI usa `helpPlugin({ exitOnHelp: true })`: hoy sale con 0. La opción es pública y no está en el README, y el README de `help` dice que el plugin agrega `--help`, cuando la flag es de `core`.
- **Decisión, 2026-11-08:** `exitOnHelp` se retira en la `0.2.0-beta.7`. Existe para recuperar el `process.exit(0)` de la 0.1.0, que ADR-0006 llama bug: saltea `cleanup`, rompe el uso embebido y puede cortar stdout en un pipe. Corregirla la dejaba como contrato para siempre, y deprecarla obligaba a mantenerla toda la 1.x. No se conoce a nadie que la use, y la beta.7 ya reinicia la ventana. **Revisar si:** una CLI real queda colgada después de la ayuda y `cleanup` no alcanza. En ese caso vuelve, con el exit code que corresponde.
- **Criterios de aceptación:**
  - `HelpPluginOptions` no tiene `exitOnHelp`, así que pasarla en TypeScript es un error de tipos.
  - En JS, `helpPlugin({ exitOnHelp })` escribe en stderr, al arrancar, que la opción se retiró y que la ayuda termina como cualquier comando. No frena la CLI.
  - Sin nada que correr el exit es 2, y con `--help` es 0.
  - El changeset la marca como retirada, que es incompatible, y `docs/components/help.md` deja de listarla.
  - El README de `help` dice lo que hace la opción y de quién es `--help`.

### T-238 Slots del tema que no tienen efecto

- **v1:** Requerido
- **Estado:** Hecho
- **Descripción:** como autor que personaliza el tema de la ayuda, quiero que cada slot cambie algo. `error` y `success` no cambian nada en el renderer por defecto, `secondary` solo colorea `(required)`, los flags y los comandos tienen colores fijos, y el README y el JSDoc describen los slots de dos formas distintas. [ADR-0029](./adr/0029-cada-campo-tiene-efecto.md) pide que cada campo tenga efecto.
- **Decisión, 2026-11-08:** el renderer por defecto cumple lo que dice el README: `primary` colorea los títulos y los nombres de comando, y `secondary` las flags, los argumentos y `(required)`. Ya no hay colores fijos en `yellow`. `error` y `success` quedan como paleta para un renderer propio (Layer 3), que recibe el tema resuelto, y la documentación dice que el renderer por defecto no los usa: la ayuda no muestra errores ni éxitos, porque los escribe `core`. Se descartó retirarlos: sería incompatible para un renderer propio que los lea, y solo dejaría la API más prolija. Es aditivo. Cambia el aspecto por defecto, que no es contrato.
- **Criterios de aceptación:**
  - Cambiar `primary` cambia los títulos y los nombres de comando; cambiar `secondary`, las flags, los argumentos y `(required)`; `muted`, los defaults y `[env: …]`; `warning`, `(deprecated: …)`. Una prueba cubre cada slot.
  - El README y el JSDoc describen los slots igual, y dicen que `error` y `success` están para un renderer propio.
  - El changeset dice que cambia el color por defecto de las flags y los comandos.

### T-239 La CLI del generador sigue las reglas de Runa

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que corre `npm create @runa-cmd`, quiero que se comporte como una CLI hecha con Runa. Tiene `-v, --version`, que [ADR-0021](./adr/0021-help-y-version-en-core.md) descarta; sus errores de uso salen sin hint y con el texto de `parseArgs`; y VERSIONING.md hace contrato sus argumentos y exit codes, que su README no lista.
- **Decisión, 2026-11-08:** el generador tiene `-h, --help` y `--version`, sin `-v`, como dice ADR-0021 para las CLIs de Runa. Sigue sin dependencias: se descartó construirlo con Runa, porque traería Zod a cada `npm create`. Sacar `-v` es incompatible para su CLI y entra en la `0.2.0-beta.7`, que ya reinicia la ventana.
- **Criterios de aceptación:**
  - `--version` muestra la versión; `-v` da `Unknown option '-v'` con exit 2 y el hint de `--help`.
  - Sus errores de uso salen con exit 2, un texto propio y el hint de `--help`. Un nombre que falta o un argumento de más dicen qué está mal.
  - Su README lista sus argumentos y exit codes.

### T-240 Completions de bash después de un posicional

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que usa TAB, quiero que `greet hello Ana --lang <TAB>` ofrezca `en es`, como lo hace `greet hello --lang <TAB>`. Hoy no ofrece nada, ni `greet hello --times 2 --l<TAB>`: el script arma la ruta del comando con todas las palabras que no son flags, y `Ana` o `2` quedan adentro. Verificado el 2026-11-08. yargs completa bien en ese caso.
- **Criterios de aceptación:**
  - En bash, después de un posicional o del valor de una opción, TAB sigue completando las opciones del comando y sus valores.
  - Lo prueba `shells.test.ts` con bash real, y se comprueba lo mismo en zsh y fish.

### T-241 Opción enum obligatoria que falta

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como quien opera una CLI, quiero que si falta una opción obligatoria que declara `env`, el error lo diga y nombre la variable, también si es un `z.enum`. Hoy, el ejemplo principal del README de `core` da `Invalid value for --env. Expected one of: staging, production`, y no `Missing required option: --env, or set DEPLOY_ENV`, como promete la misma página. Pasa igual con `z.literal` y con argumentos enum: `completions` sin shell dice `Invalid value for <shell>`. Verificado el 2026-11-08.
- **Criterios de aceptación:**
  - Una opción o un argumento obligatorio que falta da `Missing required …`, sea del tipo que sea, y nombra su variable si la declara.
  - El ejemplo `deploy` del README de `core` da el mensaje que la página promete, probado.

### T-242 Error de tipos engañoso sin `description`

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como dev que copia un ejemplo con `meta: { name }`, quiero un solo error claro si falta `description`. Hoy TypeScript suma `Type 'string' is not assignable to type 'void | Promise<void>'` sobre `run`, que parece un problema de lo que devuelve el comando.
- **Decisión, 2026-11-08:** `description` sigue obligatoria, porque es lo que lee un modelo para elegir una tool. El default de `TResult` en `defineCommand` pasa de `void` a `unknown`. La causa del error engañoso: cuando un campo falla, TypeScript no infiere los genéricos y usa los defaults, y con `void` exige que `run` no devuelva nada. Se probó en un spike sobre los tipos de la beta.6, con TypeScript 7.0.2: con `unknown` queda un solo error, y siguen fallando un `output` mal devuelto y una clave de `meta.options` que no existe. `NoInfer` en `meta` no cambió nada, y un genérico propio para `meta` perdía el chequeo de claves. **Revisar si:** algún type test depende del default `void`.
- **Criterios de aceptación:**
  - Sin `meta.description`, el único error de tipos es el de `description`.
  - Un `output` mal devuelto, una clave de `meta.options` que no existe y el tipo que recibe `format` se siguen detectando.
  - Un type test cubre cada caso, y los 11 type tests que ya existen pasan.

### T-243 `help` como comando

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como persona que escribe `tool help`, quiero ver la ayuda, como en commander, yargs, cac y oclif. Hoy da `Command not found: 'help'. Did you mean 'hello'?` y exit 127. Verificado el 2026-11-08.
- **Decisión, 2026-11-08:** `help` es un alias de `--help` donde se espera un nombre de comando, en la raíz o en un grupo. Si la CLI tiene un comando propio llamado `help`, gana ese, como dice ADR-0021 para `--help`. No es una tool de MCP ni aparece en la lista de comandos. Es aditivo, porque reemplaza un error 127. Se descartó solo sugerir `--help`: la persona o el agente igual tiene que intentar dos veces. Va en un ADR nuevo que amplía ADR-0021 y ADR-0034.
- **Criterios de aceptación:**
  - `tool help` muestra la ayuda de la CLI; `tool help db migrate`, la de ese comando; `tool db help`, la del grupo. Todos salen por stdout con exit 0.
  - `tool help noexiste` da 127 con su sugerencia, como hoy.
  - En un comando hoja, `help` es un valor más: `tool greet help` le pasa `help` al argumento.
  - Una CLI con un comando propio `help` corre ese comando.
  - Por MCP no hay una tool `help`, y la lista de comandos de la ayuda no lo muestra.

### T-244 Alias mal escritos al arrancar

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como autor, quiero enterarme al arrancar si escribí mal un alias. Con `alias: ['e']` o `['-ab']`, la ayuda muestra `-e, --x` y `-e v` da `Unknown option: -e`: el alias nunca funcionó y nada lo dice. Verificado el 2026-11-08.
- **Decisión, 2026-11-08:** un alias mal escrito frena la CLI al arrancar, como una colisión. Se descartó corregirlo solo (`'e'` como `-e`): habría dos formas de escribir lo mismo, y `'-ab'` igual tendría que fallar. Una CLI con un alias mal escrito deja de arrancar, pero ese alias nunca funcionó. Entra en la `0.2.0-beta.7`.
- **Criterios de aceptación:**
  - Un alias que no es `-x` ni `--palabra` frena la CLI al arrancar con `code: 'INVALID_OPTION_ALIAS'` y exit 1, nombrando la opción y la forma correcta: `Alias 'e' of option 'env' must be '-e' or '--word'.`
  - El código está en la lista de T-234.

### T-245 Guías de comparación honestas

- **v1:** Requerido
- **Estado:** Pendiente
- **Descripción:** como dev que compara herramientas, quiero que la guía no favorezca a Runa de más, porque eso le resta credibilidad a lo que sí gana. [La comparación](./research/2026-11-review-before-v1.md) encontró que `guides/runa-compared.md` y la investigación de facilidad de uso comparan contra commander sin `@commander-js/extra-typings`, miden el arranque sin compilar, no dicen lo que pesa `--mcp` y no comparan completions.
- **Criterios de aceptación:**
  - La guía nombra extra-typings y su inferencia de tipos.
  - El arranque se mide compilado: Runa +36 ms y commander +9 sobre Node vacío, y dice que es por Zod.
  - El peso incluye `--mcp`: 27,9 MB y 92 paquetes, y un proceso por llamada.
  - Hay una fila de completions, donde yargs es mejor.
  - Se corrigen las líneas de Runa, la versión de commander, que oclif también usa exit 2, que la ayuda no muestra rangos, los datos de oclif y que Runa pide Node 24 y ESM.

### T-246 El valor recibido en los errores

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como persona que se equivocó, quiero ver qué escribí: `Invalid value for --times: expected int` no muestra `abc`, y commander y oclif sí. El config, además, usa otro formato que la terminal para el mismo error.
- **Criterios de aceptación:**
  - Un error de tipo o de enum repite el valor recibido, sin mostrar un valor que venga de env.

### T-247 Sugerir dónde va una clave del config

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como persona que escribe el config, quiero que `{"lang": "es"}` en la raíz me diga que va dentro de `"hello"`. Hoy dice `unknown key 'lang'`.
- **Criterios de aceptación:**
  - Una clave desconocida que es una opción de un comando sugiere su lugar, como `hello.lang`.

### T-248 Alias y env junto al schema

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como autor, quiero declarar una opción en un solo lugar. Hoy el schema va en `options`, y el alias y la variable en `meta.options`. commander usa `'-s, --shout'` y oclif `char`.
- **Criterios de aceptación:**
  - Se puede declarar el alias y la variable junto al schema, y la forma actual sigue funcionando.

### T-249 Docs internas al día

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como quien lee `docs/`, que es la fuente de verdad, quiero que diga lo que el código hace. El índice de ADRs marca "pendiente de código" a 0021, 0024, 0025 y 0040 a 0045, ya implementados; `architecture.md` todavía nombra el modo implícito; y `components/core.md` dice en un lugar que una parada pasa por `onError` y en otro lo contrario.
- **Criterios de aceptación:**
  - El índice de ADRs, `architecture.md` y `components/core.md` coinciden con el código.
  - `docs:check` falla si un ADR "pendiente de código" nombra una tarea en Hecho.

### T-250 Detalles de coherencia

- **v1:** Opcional
- **Estado:** Pendiente
- **Descripción:** como persona que usa una CLI, quiero que lo mismo se diga igual en todos lados. Los menores de [la revisión](./research/2026-11-review-before-v1.md): `Expected one of` con punto o con dos puntos, `invalid value` en minúscula en el config; `GLOBAL OPTIONS` antes de `COMMANDS` en la ayuda de un grupo; la lista de secciones del README de `help`; la versión que falta en la ayuda de una CLI con `runCLI`; el README de `completions` sobre el nombre del comando; la ruta de Claude Desktop y la arquitectura en el README de `mcp`; `replaceHelp` en la tabla de Plugin API; `meta.version` de un subcomando, que no hace nada; y `cli.run()` sin `await` en los READMEs. Además, los tests tienen errores de tipos que nadie ve, porque `pnpm typecheck` no los incluye y vitest no chequea tipos: medido el 2026-11-08, con `tsc --strict` sobre los `*.test.ts` de cada paquete, con flags propios y no con su tsconfig, hay 11 en `core`, 1 en `help`, 8 en `mcp`, 8 en `completions` y 0 en `create`. Casi todos son mocks y fixtures que quedaron atrás de los tipos: un `OptionSchema` sin `flag`, un `PluginAPI` sin `help` o sin `command`, un contexto sin `invocation`. Uno es de T-234: la clase de `error-codes.test.ts` que simula otra copia de `core` declara `[Symbol.for(...)]` como propiedad, y TypeScript no lo acepta (TS1166).
- **Decisión, 2026-11-08, sobre `meta.version`:** un comando con `meta.version` dentro de `defineCLI` frena la CLI al arrancar, porque ahí se ignora: solo tiene efecto cuando el comando es la CLI, con `runCLI`. El tipo no lo puede detectar, porque el mismo `defineCommand` sirve en los dos. Se descartó un aviso por stderr, que le llegaría en cada corrida a quien usa la CLI y no puede arreglarlo, y darle efecto con una versión por comando, que nadie pidió. Entra en la `0.2.0-beta.7`.
- **Criterios de aceptación:**
  - Cada punto se corrige, o se descarta con su motivo.
  - Un comando con `meta.version` dentro de `defineCLI` frena al arrancar con exit 1, un `code` de la lista de T-234 y el mensaje `'version' only applies with runCLI; set it in defineCLI's meta.`
  - Los tests no tienen errores de tipos, medido con el tsconfig de cada paquete. Se decide si `pnpm typecheck` los incluye, para que un mock que quedó atrás de los tipos no vuelva a pasar inadvertido.

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

### T-605 Generador de proyectos

- **v1:** Opcional
- **Estado:** Hecho
- **Resultado:** el paquete empaquetado con `pnpm pack` crea `my-tool` en 1,6 s desde una carpeta vacía. Contra `@runa-cmd/core@0.2.0-beta.4` de npm, el proyecto instala, corre, pasa sus 3 tests, compila y se instala como `my-tool`. Un nombre inválido o una carpeta con archivos salen con exit 2 sin escribir nada. En CI, una prueba genera un proyecto, corre sus tests y lo compila contra el workspace. La versión de `core` se graba al compilar el generador, en `template/runa.json`, y no se toma de la versión propia: después de T-506 los paquetes dejan de compartir versión. Se hizo antes de terminar T-503, por decisión del mantenedor, en vez de esperar evidencia de que la guía era larga.
- **Incidente antes de la beta.5:** el PR "Version Packages" subió `examples/getting-started` a `1.0.1-beta.0`, porque Changesets también versionaba los paquetes privados. Como es la plantilla, cada proyecto nuevo iba a decir `1.0.1-beta.0` en su `package.json` y `1.0.0` con `--version`. Lo frenó la prueba "starts with the version that --version prints" en CI, antes de publicar. Se apagó `privatePackages` en `.changeset/config.json`, los ejemplos volvieron a `1.0.0`, y el build de `create` falla si las dos versiones de la plantilla difieren: `pnpm release` compila pero no corre las pruebas, así que sin ese chequeo un caso así llegaba a npm.
- **Decisión:** `@runa-cmd/create`, que se usa como `npm create @runa-cmd my-tool`, porque el nombre queda dentro del scope. No tiene dependencias, no instala nada por su cuenta y no hace preguntas. Su plantilla es `examples/getting-started`, así que genera lo mismo que enseña la guía. Se versiona con los otros paquetes.
- **Descripción:** como dev nuevo, quiero empezar una CLI con un comando, como `npm create runa-cmd@latest my-tool`, sin saber de `type: module`, `tsconfig`, shebang ni `bin`. Hoy hay que armar todo a mano, y la guía de inicio de T-503 tiene muchos pasos. Es una propuesta del mantenedor, sin pedido de usuarios: la prioridad del proyecto es que empezar sea fácil.
- **Criterios de aceptación:**
  - Un comando crea un proyecto que corre, se prueba con `testCLI()` y se compila para distribuir.
  - El proyecto separa la definición de la CLI de su arranque, para poder probarla.
  - Lo que genera es lo mismo que enseña la guía de inicio, verificado en CI.
  - Se decide después de T-503: si la guía resulta larga o frágil, esa es la evidencia para hacerlo.

## Fuera de alcance por ahora

Se retoman solo con un pedido real:

- **`defineCLI({ command })` y comando por defecto:** `runCLI` cubre el caso, y se pueden sumar después sin romper nada.
- **Alias corto `-V`:** no hay un estándar compartido.
- **Prompts y spinners:** sería una API nueva sin validar. Por ahora conviene documentar la integración con librerías existentes.
- **Loaders YAML y TOML:** son paquetes opcionales que no bloquean a `core`.
