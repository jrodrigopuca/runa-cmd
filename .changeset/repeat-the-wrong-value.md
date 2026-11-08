---
'@runa-cmd/core': patch
---

A wrong value is repeated in its error, as commander and oclif do, so you see what you typed:

```
Invalid value 'abc' for --times: expected number
Invalid value 'mars' for --env. Expected one of: staging, production
```

Only a value typed at the terminal or sent by a model, cut after 40 characters and kept on one line. A value from env or from the config file is never shown, nor the value of an option that declares `env`, even typed, since those often hold a secret and an error can end up in a CI log.
