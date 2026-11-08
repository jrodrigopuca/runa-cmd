---
'@runa-cmd/core': minor
---

An alias that can't work stops the CLI at startup, with `INVALID_OPTION_ALIAS` and the way to write it:

```
Alias 'e' of option 'env' of command 'deploy' must be '-e'.
```

An alias is one character as `-e`, or a word as `--environment`. Before, `alias: ['e']` or `['-ab']` showed in the help, and `-e` was an unknown option, with nothing saying why.

**Breaking:** a CLI with such an alias doesn't start until it's fixed. The alias never worked, and the error shows up the first time its author runs it.
