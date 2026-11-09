---
'@runa-cmd/core': patch
'@runa-cmd/mcp': minor
---

**Breaking:** a tool call that fails because a value the operator gave breaks its schema, in env or in the config file, now comes with `class: "not_configured"`, as a missing value does, instead of `invalid_input`. Its text says what the operator has to fix, never the value, so a model doesn't take it as its own mistake:

```
The operator of this server has to fix 'deploy.replicas' in the config file. It isn't a value you can send.
```

The server also says it at startup, on stderr, with the reason, and keeps serving the other tools:

```
mcpPlugin: tool 'deploy' can't run until the operator fixes DEPLOY_ENV (--env): expected one of: staging, production.
```

Values are checked with the rules the CLI uses, so `"5"` for a number in the config file is fine.
