---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Completions now work the way they're suggested, with any text.

`eval "$(tool completions zsh)"` used to fail on every shell start. The script now registers itself with `compdef`, so it works in a `.zshrc` after `compinit`, as well as from a file in `fpath`.

In zsh, a `]` in a description used to end it early, and what followed was run as a command when pressing TAB, so `Mode [x]: fast` left the option without completion and could run `mode`. Brackets and colons are now escaped.

An enum value with a space, like `very slow`, used to be split in two candidates in bash, zsh and fish. It's now one.

CI runs the generated scripts in the real shells.
