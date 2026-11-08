---
'@runa-cmd/core': minor
'@runa-cmd/help': minor
---

`meta.options.<key>.defaultDescription` sets what help shows as the default. A default built from the home folder can show as `~/.tool/control.sock`, instead of the path of whoever ran `--help`. The command still gets the real value.
