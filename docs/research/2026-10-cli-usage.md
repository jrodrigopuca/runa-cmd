# Cómo se usan los frameworks de CLI

> **Fecha:** 2026-10-30. Documento histórico: no se actualiza.

**Pregunta:** antes de cambiar la API de Runa, ¿qué esperan los devs de una CLI, y qué vale la pena implementar?

## Método

- **Comportamiento:** el mismo CLI se ejecutó en commander 15.0.0, yargs 18.2.0, citty 0.2.2, cac 7.1.0, meow 14.1.0 y clipanion 4.0.0-rc.4.
- **Uso real:** búsqueda de código en GitHub, un archivo por repo, sin forks, conteo con regex.
- **Guías:** clig.dev, POSIX, GNU y el README de commander.

## Comportamiento

Clipanion queda fuera de las filas de `--help` y `--version`: el fixture lo registró mal.

| Prueba | commander | yargs | citty | cac | meow | clipanion |
|---|---|---|---|---|---|---|
| `--help` sin paquete extra | Sí | Sí | Sí | Sí | Sí | No válido |
| `-h` | Sí | No | Sí | Sí | No | No válido |
| `--version` con versión declarada | Sí | Sí | Sí | Sí | Sí | No válido |
| `-V` | Sí | No | No | No | No | No válido |
| `-v` | No | No | Sí | Sí | No | No válido |
| `--dark-color` para `darkColor` | Sí | Sí | Sí | Sí | Sí | Sí |
| Acepta `--darkColor` | No | Sí | Sí | Sí | Sí | No |
| `-- -text` llena el posicional | Sí | No | Sí | No | Sí | Sí |
| `hola -- -text` | Error | Va al resto | Va al resto | Va al resto | Va al input | Error |
| El usuario declara `-h` | Gana usuario | Gana usuario | Gana usuario | Falla, sin diagnóstico | Gana usuario | Gana usuario |

Con un comando raíz con argumento y un subcomando:

| Entrada | commander | citty |
|---|---|---|
| `tool hola` | Corre la raíz | Falla |
| `tool completions` | Corre el subcomando | Corre subcomando y raíz |
| `tool -- completions` | Corre el subcomando | Corre la raíz con el dato |
| `[target]` opcional con `-- ls -la` | `target = ls` | `target = ls` |

La prueba de `--version` declarado por el usuario se hizo sin activar la versión integrada, así que no demuestra qué pasa si ambas conviven.

## Uso en código público

**Archivos de entrada con commander**, los que llaman a `.parse`. Muestra: 388.

| Medida | Resultado |
|---|---|
| Sin subcomandos | 215 (55%) |
| Con `.version()` | 304 (78%) |
| Flags de varias palabras | 672 de 2.347 |
| De esas, en kebab-case | 618 (92%) |

**Muestra amplia**, cualquier archivo que importa la librería:

| Medida | commander (299) | yargs (192) | citty (111) | cac (82) |
|---|---|---|---|---|
| Pass-through (`--`) | 4% | 3% | 13% | 17% |
| `-h` para otra cosa | 4% | 3% | 0% | 2% |
| Opción propia `--version` | 1% | 0% | 0% | 4% |

## Guías

- **POSIX, guideline 10:** lo que sigue al primer `--` se trata como operandos, aunque empiece con `-`.
- **GNU:** todos los programas deberían soportar `--version` y `--help`.
- **clig.dev:** mostrar ayuda con `-h` y `--help`, no reutilizar `-h`, evitar `-v` por ambiguo, y sugerir qué hacer ante un error.

## CLI y MCP

Fuentes mayormente de vendors, sin benchmarks independientes.

- Escribir un servidor MCP a mano es trabajo mecánico: tools, schemas, argumentos y formato de salida.
- Los wrappers que leen `--help` dependen de la calidad de ese texto.
- Exponer una CLI completa a un agente es un riesgo que hay que acotar.
- Varias fuentes recomiendan CLI por defecto para agentes de código con shell, y MCP para casos especializados o sin shell.
- Las definiciones de tools consumen contexto, aunque depende de cada cliente.
- Las anotaciones de MCP son pistas para el cliente, no control de acceso.

## Limitaciones

- El buscador de GitHub devuelve una muestra sesgada, con repos viejos.
- El conteo por regex tiene errores. En un control de 15 archivos clasificados como comando único, al menos uno parece cargar comandos desde otro módulo. El 55% debe leerse como "cerca de la mitad".
- Muestra lo que la gente hace, no lo que le molesta. No hubo entrevistas.
- Las descargas de npm incluyen dependencias transitivas, así que no miden uso directo.

## Fuentes

- [clig.dev](https://clig.dev/)
- [POSIX, Utility Conventions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html)
- [GNU Coding Standards](https://www.gnu.org/prep/standards/standards.html)
- [README de commander 15](https://cdn.jsdelivr.net/npm/commander@15.0.0/Readme.md)
- [Manveer: MCP vs. CLI](https://manveerc.substack.com/p/mcp-vs-cli-ai-agents)
- [Zuplo: CLI or MCP](https://zuplo.com/blog/2026/01/14/cli-or-mcp)
- [any-cli-mcp-server](https://enterprisedna.co/directories/mcp/eirikb-any-cli-mcp-server)
- [cli2mcp](https://skillselion.com/mcp/tool/io.github.RonieNeubauer/cli2mcp)
- [MCP Bundles: tool annotations](https://www.mcpbundles.com/guides/tool-annotations)
