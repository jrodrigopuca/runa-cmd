---
'@runa-cmd/help': minor
---

Every color of the default help now comes from the theme. Command names take `primary`, as the section titles do, and flags and arguments take `secondary`, as `(required)` does: before, all of them were a fixed yellow that no theme could change. This changes the default look: flags, arguments and command names were yellow, and now they're the theme's colors.

The README and the docs of `Theme` say the same thing about each slot. `error` and `success` are for a renderer of your own: the default one doesn't use them, since the help shows no errors and no successes.
