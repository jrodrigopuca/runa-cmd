---
'@runa-cmd/core': patch
---

A wrong config file says what's wrong the same way in every case, and with the words the terminal uses. Each error names the file first:

```
my-tool.config.json: invalid value for 'clear.limit': must be greater than 0
my-tool.config.json: unknown key 'clear.limt'. Did you mean 'limit'?
my-tool.config.json: invalid JSON: Unexpected token '}', ..."force":tru}}" is not valid JSON
```

Before, a value said `Too small: expected number to be >0`, and broken JSON came in another format, over several lines. A boolean that gets anything else now says `expected true or false`, from the file, from env or from the terminal, instead of `expected boolean`. The README says which values a file takes: its JSON type, or the text you'd type at the terminal, as `"5"` or `"true"`.
