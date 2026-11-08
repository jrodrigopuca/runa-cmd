---
'@runa-cmd/core': patch
'@runa-cmd/help': patch
---

Every public type, function and option now has a description, so your editor shows what each one is for. `HookContext.rawArgs` says what it holds at each step: the whole argv in `beforeParse`, and only the command's part from `onGlobalFlags` on. No code changed.
