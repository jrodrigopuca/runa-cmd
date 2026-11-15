---
'@runa-cmd/core': patch
---

A value after a negated boolean is now a usage error, exit 2: `--no-cache=true` says `Option --no-cache does not take a value`. Before, the value was dropped and the option kept its default with exit 0, so `--no-cache=true` left `cache` on, the opposite of what was asked. It also applies to a long alias and a global option, and with `strictOptions: false`. To pass a value, write `--cache=false`.
