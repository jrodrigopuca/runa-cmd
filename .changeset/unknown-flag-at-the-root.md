---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

A flag where a command should be is now a usage error. `tool --bogus` used to say `Command not found: '--bogus'` and exit with 127.

**Breaking:** it now says `Unknown option: --bogus` and exits with 2, with the same suggestions as a flag after a command, so `--verison` points to `--version`. A script that checked for 127 here has to check for 2. An unknown command still exits with 127.
