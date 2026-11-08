---
'@runa-cmd/completions': patch
---

TAB keeps completing after a positional or an option's value. `greet hello Ana --lang <TAB>` offered nothing in bash and zsh, nor did `greet hello --times 2 --l<TAB>`: bash took `Ana` and `2` as part of the command, and zsh didn't know where to place `Ana`. Now bash only follows words that name a command, and skips an option's value, so `--lang plain` never leads to a command named `plain`. zsh declares each command's positionals. fish already worked. Regenerate the script to get it: `my-tool completions bash`.
