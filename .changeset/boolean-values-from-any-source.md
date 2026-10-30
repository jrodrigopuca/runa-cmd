---
"@runa-cmd/core": minor
"@runa-cmd/help": minor
"@runa-cmd/mcp": minor
"@runa-cmd/completions": minor
---

Boolean options now follow CLI > env > config > default.

- **Env and config are honored.** A boolean with `.default()` used to ignore both silently: `MINIFY=true` gave `false`. The schema default no longer reaches `parseArgs`, so it applies last.
- **Booleans accept `true`, `1`, `false` and `0`,** in any case, from every source. `MINIFY=true` on an optional boolean used to fail, and `--minify=false` used to exit 2.
- **Any other value is a usage error (exit 2).** Before, `MINIFY=quizas` on a boolean with a default was silently ignored.

**Migration:** an env var or config value that was being ignored now takes effect, and an invalid one now fails. Check the boolean options of your CLI that declare `env`.
