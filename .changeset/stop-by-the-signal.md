---
'@runa-cmd/core': minor
---

A run stopped by `SIGINT` or `SIGTERM` ends by that same signal, after cleanup, instead of `exit(130)` or `exit(143)`. The shell still sees 130 or 143, and systemd now counts a stopped service as a clean stop instead of `failed`. A program that starts your CLI with `spawn` sees `signal: 'SIGTERM'` instead of `code: 143`. On Windows nothing changes.

If `run()` ends well after the signal, it's no longer reported as an error: no `Interrupted.` and no `onError`. A command that fails because of the abort, or doesn't end in time, still prints `Interrupted.`.
