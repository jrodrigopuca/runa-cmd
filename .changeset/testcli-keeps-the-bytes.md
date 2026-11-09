---
'@runa-cmd/core': minor
---

`testCLI()` keeps the exact bytes a command writes, in the new `stdoutBytes` and `stderrBytes` of its result, so a CLI that writes a PNG, a zip or a tar to stdout can be tested without a subprocess:

```ts
const result = await testCLI(cli, ['export', '--format', 'png']);
assert.deepEqual(result.stdoutBytes.subarray(0, 4), Uint8Array.from([0x89, 0x50, 0x4e, 0x47]));
```

Before, every write was decoded as UTF-8 on its own, so each byte that isn't valid UTF-8 became U+FFFD in `stdout`, with no way back and no warning. `stdout` and `stderr` are still the same text, now decoded once, so a character split across two writes comes out whole, and a string written with an encoding, as `write('ff', 'hex')`, keeps it. When a stream isn't valid UTF-8, `testCLI()` emits a Node warning, `RUNA_TESTCLI_NOT_UTF8`, that points to the bytes.
