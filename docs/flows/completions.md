# Generación de completions

> **Fuente:** `packages/completions/src` · **Verificado:** 2026-10-30

```mermaid
sequenceDiagram
    participant U as Usuario
    participant C as core
    participant P as Comando completions
    participant G as Generador
    Note over C: setup agrega el comando
    U->>C: mycli completions zsh
    C->>P: run({ args: { shell: 'zsh' } })
    P->>C: getSchema()
    alt --instructions
        P->>U: instrucciones por stdout
    else
        P->>G: generateZshCompletions(schema, binName)
        G-->>P: script
        P->>U: script por stdout
    end
```

## Instalación típica

```bash
mycli completions zsh --instructions
```

Las instrucciones son distintas para cada shell. Runa nunca modifica los archivos del usuario.

## Efecto en el árbol de comandos

`setup` llama a `api.addCommand('completions', ...)`. Por eso el árbol pasa a tener dos entradas y se pierde el modo implícito de comando único (KI-006 en [known issues](../known-issues.md)).

El comando aparece en sus propias completions, para poder autocompletar `mycli completions <TAB>`.
