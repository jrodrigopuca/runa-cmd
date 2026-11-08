---
'@runa-cmd/help': patch
'@runa-cmd/mcp': patch
'@runa-cmd/completions': patch
---

Each plugin requires the `@runa-cmd/core` it was released with. The peer of `help` was `^0.2.0-beta.1`, so npm could install it with an older `core` where `defaultDescription` and the `GLOBAL OPTIONS` section did nothing, without a warning. Until 1.0, the peer is always core's current version.
