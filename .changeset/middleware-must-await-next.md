---
'@runa-cmd/core': minor
---

A middleware that forgets `next()`, or calls it without `await`, now fails instead of passing in silence:

- Returning without calling `next()` fails with `MIDDLEWARE_DID_NOT_CALL_NEXT`, exit 1. Before, the command didn't run and the CLI exited with 0. Through MCP, such a call now reports `class: 'rejected'` instead of `'not_run'`, with the same `effect: 'none'`, and its text says why.
- Calling `next()` without `await` fails with `MIDDLEWARE_DID_NOT_AWAIT_NEXT`, after the command ends. Before, `afterRun` and `cleanup` ran while the command still worked.

To skip a command on purpose, throw: `new CommandError('Dry run: would deploy api', { exitCode: 0 })`. `RunaError` also takes a `cause`.
