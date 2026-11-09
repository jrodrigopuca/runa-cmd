---
'@runa-cmd/core': minor
---

Inside a command, two options that claim the same token stop the CLI at startup with `OPTION_COLLISION`, as its docs always said:

```
Options 'extra' and 'env' of command 'deploy' both use '-e'.
Option 'env' of command 'deploy' has '--env' as an alias, which is already its flag. Remove the alias.
```

Before, only collisions with a global option were caught. Two options with `-e` kept the first one; an alias equal to another option's flag, or to the `--no-` of a boolean, took it over; and an alias equal to its own option's flag threw the typed value away, so `--env prod` gave the default, with exit 0.

**Breaking:** a CLI with one of those aliases doesn't start until it's fixed. None of them worked as written.
