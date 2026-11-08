---
'@runa-cmd/completions': patch
---

In fish, TAB after an enum option offers only its values. It also listed the files of the current folder next to them, as `CHANGELOG.md` and `src/` after `--lang`. An option that takes text still completes file names, since its value may be a path.
