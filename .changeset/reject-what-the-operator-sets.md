---
'@runa-cmd/mcp': minor
---

**Breaking:** a tool call that sends an option the operator fixed now fails, and nothing runs:

```
'replicas' is set by the operator of this server, so it can't be sent.

The command did not run.
```

It comes with `class: "invalid_input"` and `effect: "none"`, and never shows the operator's value. Before, the value was dropped and the call answered success with the operator's value: a model that sent `replicas: 5` got back a deploy with 2, and believed it had done what it was asked. An option that declares `env`, or has a value in the config file, is the operator's. To let the model choose it, list it in `expose`.
