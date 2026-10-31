# Qué aprender del CLI de AWS

> **Fecha:** 2026-10-31. Documento histórico: no se actualiza.

**Pregunta:** ¿qué le enseña a Runa una CLI estable y muy usada?

**Respuesta:** lo más valioso es cómo separa los datos de su presentación: un comando produce una estructura, y un solo ajuste decide cómo se muestra. Se aplica directo a [T-212](../backlog.md#t-212-lo-que-devuelve-un-comando-llega-a-la-terminal). AWS es un producto con un único dominio, y Runa es un framework, así que no todo se traslada.

## Método

Se leyó la documentación oficial. No se ejecutó el CLI de AWS. La comparación con otras herramientas sale de sus páginas oficiales.

## Lecciones

| Tema | Qué hace AWS | Qué significa para Runa |
|---|---|---|
| Salida | Cada comando produce datos, y `--output` elige `json`, `yaml`, `yaml-stream`, `text`, `table` u `off`. El default es JSON ([fuente](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-output-format.html)) | Devolver datos y dejar la presentación al framework es un modelo probado |
| Preferencia | El formato se elige por `output` en config, `AWS_DEFAULT_OUTPUT` o `--output`, con esa misma prioridad | Coincide con la prioridad de Runa |
| Salida para personas | `table` es fácil de leer, y la documentación aclara que es menos útil para programas | Lo legible y lo procesable son dos cosas, y conviene no mezclarlas |
| Estabilidad del texto | Recomienda usar `--query` con `text`, porque las columnas siguen el orden de las claves y pueden cambiar | Coincide con [`VERSIONING.md`](../../VERSIONING.md): el texto para personas no es contrato |
| Errores | `off` silencia stdout, y los errores siguen en stderr | Coincide con el contrato de streams |
| Exit codes | 2 si no se pudo interpretar; 130 por `SIGINT`; 252 parámetro inválido; 253 entorno o config inválidos; 254 error del servicio; 255 otro fallo ([fuente](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-returncodes.html)) | Separa uso, entorno y servicio. Runa usa 2 para uso y config. Separar el entorno es una idea a evaluar, no una necesidad demostrada |
| Diagnóstico | `--debug` produce un informe de los pasos de la ejecución y su resultado | Es el modelo para el registro de `testCLI()` en [ADR-0041](../adr/0041-funcion-de-pruebas.md), y podría extender `RUNA_DEBUG=1` |
| Config | Secciones con nombre: perfiles, `sso-session` y `services`; un perfil elige un conjunto completo de valores ([fuente](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)) | Los perfiles sirven para cuentas y entornos, que Runa no modela. No hace falta adoptarlos ahora |

## Otros modelos de salida

| Herramienta | Default | Máquina |
|---|---|---|
| AWS | JSON | `--output` |
| [gh](https://cli.github.com/manual/gh_help_formatting) | Texto por línea | `--json campos`, y `--jq` para filtrar |
| [oclif](https://oclif.io/docs/json) | Lo que el comando imprime | Con `enableJsonFlag`, `--json` suprime sus logs e imprime lo devuelto. `console.log` no se suprime |

## Lo que no conviene copiar

- **`--output` como flag del framework:** qr-plus ya usa `--output` para un archivo, y es un nombre común. Reservarlo chocaría con CLIs reales.
- **`--query` o `yaml`:** ningún reporte los pidió, y `core` no tiene dependencias de runtime.
- **Cuatro exit codes nuevos:** significados extra sin un consumidor que los pida. Agregar un código después de la 1.0 cambia el contrato, así que debería decidirse antes si hiciera falta.
