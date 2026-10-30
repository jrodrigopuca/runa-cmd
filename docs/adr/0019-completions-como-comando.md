# ADR-0019: Completions como comando, con generadores puros

- **Estado:** aceptada
- **Drivers:** generar scripts es producir una salida, no cambiar el comportamiento de otra ejecución. Deben funcionar en entornos mínimos, incluido bash 3.2 de macOS.
- **Decisión:** el plugin agrega `mycli completions <bash|zsh|fish>`, con nombre configurable. Cada generador es una función pura de schema a string. El script sale por stdout, y `--instructions` muestra cómo instalarlo. El comando aparece en sus propias completions. Bash usa `COMP_WORDS` y `compgen`, sin el paquete `bash-completion`.
- **Alternativas descartadas:** una flag `--completions` mezcla conceptos. Clases o motores de plantillas no aportan nada. Instalar solo es riesgoso, porque tocaría `~/.bashrc` sin consentimiento.
- **Costo aceptado:** agregar un comando interfiere hoy con el modo implícito de comando único ([ADR-0023](./0023-runcli-y-modo-raiz.md)).
- **Revisar si:** usuarios reales piden PowerShell.
- **Código:** `packages/completions/src/plugin.ts`, `packages/completions/src/generators/bash.ts`
