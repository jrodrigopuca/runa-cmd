# ADR-0023: `runCLI` con plugins y modo raíz explícito

- **Estado:** aceptada
- **Drivers:** el modo de comando único depende de contar claves, y `completionsPlugin` lo rompe (`tool hola` da 127). `runCLI` no acepta plugins, así que cerca de la mitad de los casos no llega a `--mcp` sin reescribir el arranque.
- **Decisión:** `runCLI(cmd, { plugins })` es la API de un comando y `defineCLI` la de muchos. Por dentro, `runCLI` usa un modo raíz explícito: nunca consume un token por coincidir con el nombre. Un subcomando agregado por un plugin puede convivir, gana sobre el comando raíz, y `--` permite pasar ese texto como dato. El modo implícito de `defineCLI` se depreca y se retira antes de la 1.0.
- **Alternativas descartadas:** `defineCLI({ command })` agrega un concepto que `runCLI` ya cubre. Un `command` excluyente de `commands` no sirve con plugins que agregan comandos. Retirar el modo implícito de golpe rompe sin aviso.
- **Costo aceptado:** un dato igual al nombre de un subcomando requiere `--`. Un comando por defecto dentro de un árbol queda sin resolver.
- **Revisar si:** usuarios reales piden comando por defecto en `defineCLI`, o la raíz exige reescribir los generadores de completions.
- **Implementación:** [T-203](../backlog.md#t-203-runcli-con-plugins-y-modo-raíz-explícito), [T-208](../backlog.md#t-208-retirar-el-modo-implícito)
