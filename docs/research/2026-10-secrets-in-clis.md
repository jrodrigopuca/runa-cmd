# Secretos en frameworks de CLI

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿cómo tratan los secretos los frameworks de CLI, y qué le toca a Runa?

**Decisión resultante:** [ADR-0032](../adr/0032-postura-sobre-secretos.md).

## Método

Búsqueda de `secret`, `sensitive`, `password`, `redact` y `mask` en el código instalado de commander 15, yargs 18, yargs-parser, citty, cac, meow y clipanion. Lectura de documentación para el resto.

## Resultados

| Herramienta | Qué hace | Alcance | Fuente |
|---|---|---|---|
| commander, yargs, citty, cac, clipanion | Sin ningún concepto de secreto | — | Código: 0 coincidencias |
| meow | Sin concepto propio; la única coincidencia está en sus dependencias empaquetadas | — | Código |
| oclif | Sin tipo secreto; `hidden`, `defaultHelp` y `noCacheDefault` controlan ayuda y manifiesto | Ayuda | [Flags](https://oclif.io/docs/flags/) |
| clap | `hide_env_values` omite el valor de la variable en `--help` | Ayuda | Código de `clap_builder` |
| Click | `password_option` pide el valor sin mostrarlo, con confirmación | Prompt | [API](https://click.palletsprojects.com/en/stable/api/) |
| Ophis | `ExcludeFlags("token", "secret")` saca flags de la tool | Schema MCP | [README](https://github.com/njayp/ophis) |
| GitHub Actions | Redacción por coincidencia exacta de valores registrados | Logs | [Secure use](https://docs.github.com/en/actions/reference/security/secure-use) |
| Pydantic | `SecretStr` enmascara `repr`, `str` y JSON; se lee con `get_secret_value()` | Tipo | [Tipos](https://pydantic.dev/docs/validation/latest/api/pydantic/types/) |

## Lo que dicen las guías

- **clig.dev:** no leer secretos de flags, por `ps` y el historial, ni de variables de entorno, por su tendencia a filtrarse. Aceptarlos por archivos, pipes o sockets.
- **MCP:** con stdio, tomar las credenciales del entorno. La autorización es a nivel de transporte.
- **GitHub:** la redacción automática no está garantizada, porque un valor se puede transformar. Registrar también los valores derivados, y no envolver secretos en JSON o YAML.
- **Pydantic:** `SecretStr` evita filtraciones en logs y tracebacks, pero no cifra.

## Lectura

Las guías de clig.dev y MCP se contradicen sobre el entorno. Un servidor MCP stdio lo lanza un cliente, que pasa las credenciales por env, así que Runa sigue a MCP en ese caso.

Ninguna CLI comparable modela secretos porque quien la corre ya los posee. El lector no confiable aparece con MCP.

## Limitaciones

La búsqueda en código no detecta un concepto con otro nombre. Para commander, se complementó con su README. Incur no se analizó a fondo: la única coincidencia estaba en su changelog.
