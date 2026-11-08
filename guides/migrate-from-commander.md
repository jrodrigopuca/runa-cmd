# Migrating from commander

How to move a commander CLI to Runa, one piece at a time, and what changes for the people and scripts that already use it.

It follows a small CLI, `badge`, that makes an SVG badge. It has the shape of most commander CLIs: one command, a positional argument, short flags, an option with a fixed set of values, a validated value and a file to write. [`@qr-plus/cli`](https://github.com/jrodrigopuca/qr-code-generator/tree/master/packages/cli) went through the same migration, and what it found is in this guide.

The commander code is version 15.0.0, run once on 2026-11-03. The Runa code is [`examples/from-commander`](https://github.com/jrodrigopuca/runa-cmd/tree/main/examples/from-commander), and its tests run in CI.

## Before you start

- **Node 24 or later.** Runa needs it. If your CLI supports older versions, that's a breaking change for the people using it.
- **ESM.** Runa has no CommonJS build, so your package needs `"type": "module"`.
- **Plan a major version.** Your code changes, but so does what people see: exit codes, `-V`, and the wording of errors and help. Section 5 lists all of it. qr-plus moved from 1.0 to 2.0.

```bash
npm uninstall commander
npm install @runa-cmd/core@beta zod
```

Until Runa reaches 1.0, install it with `@beta`.

## 1. Keep what the CLI does apart from how it's called

The migration only touches the code that reads the command line. What the CLI does stays as it is, so it's worth having it in its own file first. In `badge`, that's this function, which doesn't change:

<!-- file: examples/from-commander/src/badge.ts -->
```ts
// What the CLI does, apart from how it's called. It doesn't change when the CLI
// moves from commander to Runa.
export interface BadgeOptions {
	style: 'flat' | 'round';
	textColor: string;
	uppercase: boolean;
}

const escapeXml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderBadge(label: string, { style, textColor, uppercase }: BadgeOptions): string {
	const text = escapeXml(uppercase ? label.toUpperCase() : label);
	const width = 10 + label.length * 7;
	const radius = style === 'round' ? 8 : 0;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20">`,
		`<rect width="${width}" height="20" rx="${radius}" fill="#555"/>`,
		`<text x="5" y="14" fill="${textColor}" font-family="sans-serif" font-size="11">${text}</text>`,
		'</svg>',
	].join('');
}
```

## 2. Translate the command

This is the CLI with commander:

```ts
import { writeFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import { renderBadge } from './badge.ts';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const program = new Command();

program
  .name('badge')
  .description('Make an SVG badge')
  .version('1.0.0')
  .argument('<label>', 'Text on the badge')
  .option('-o, --output <file>', 'Write to a file instead of stdout')
  .addOption(
    new Option('-s, --style <style>', 'Badge style').choices(['flat', 'round']).default('flat'),
  )
  .option('--text-color <hex>', 'Text color', '#ffffff')
  .option('--uppercase', 'Use capital letters', false)
  .action((label: string, options) => {
    if (!HEX_COLOR.test(options.textColor)) {
      program.error('--text-color must be a hex color, such as #ffffff');
    }
    const svg = renderBadge(label, options);
    if (!options.output) {
      console.log(svg);
      return;
    }
    try {
      writeFileSync(options.output, svg);
    } catch (error) {
      console.error(`Cannot write ${options.output}: ${(error as Error).message}`);
      process.exit(1);
    }
    console.log(`Saved to ${options.output}`);
  });

program.parse();
```

And this is the same CLI with Runa:

<!-- file: examples/from-commander/src/cli.ts -->
```ts
import { writeFileSync } from 'node:fs';
import { CommandError, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { renderBadge } from './badge.ts';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const badge = defineCommand({
	meta: {
		name: 'badge',
		version: '1.0.0',
		description: 'Make an SVG badge',
		options: {
			output: { alias: ['-o'], valueName: 'file' },
			style: { alias: ['-s'] },
			textColor: { valueName: 'hex' },
		},
	},
	args: {
		label: z.string().describe('Text on the badge'),
	},
	options: {
		output: z.string().optional().describe('Write to a file instead of stdout'),
		style: z.enum(['flat', 'round']).default('flat').describe('Badge style'),
		textColor: z
			.string()
			.regex(HEX_COLOR, '--text-color must be a hex color, such as #ffffff')
			.default('#ffffff')
			.describe('Text color'),
		uppercase: z.boolean().default(false).describe('Use capital letters'),
	},
	run({ args, options }) {
		const svg = renderBadge(args.label, options);
		if (!options.output) return svg;

		try {
			writeFileSync(options.output, svg);
		} catch (error) {
			throw new CommandError(`Cannot write ${options.output}: ${(error as Error).message}`);
		}
		return `Saved to ${options.output}`;
	},
});
```

<!-- file: examples/from-commander/src/main.ts -->
```ts
#!/usr/bin/env node
import { runCLI } from '@runa-cmd/core';
import { badge } from './cli.ts';

await runCLI(badge);
```

Piece by piece:

| commander | Runa |
|---|---|
| `.name()`, `.description()`, `.version()` | `meta.name`, `meta.description`, `meta.version` |
| `.argument('<label>', 'Text')` | `args: { label: z.string().describe('Text') }` |
| `.argument('[label]')` | `.optional()` on the schema |
| `.argument('<files...>')` | `z.array(z.string())`, in the last argument |
| `.option('--text-color <hex>', 'Text', '#fff')` | `textColor: z.string().default('#fff').describe('Text')`, with `valueName: 'hex'` in `meta.options` |
| `-o, --output` | The key is `output`, and `alias: ['-o']` goes in `meta.options` |
| `.option('--uppercase')` | `z.boolean().default(false)`. `--no-uppercase` works with no extra code |
| `.requiredOption()` | A schema without `.default()` or `.optional()` |
| `new Option().choices([...])` | `z.enum([...])` |
| `new Option().env('BADGE_STYLE')` | `env: 'BADGE_STYLE'` in `meta.options` |
| `.argParser()` or a check in `.action()` | The schema: `.regex()`, `.min()`, `.refine()`, or `z.number()` to get a number |
| `program.error(message)` | Throw `CommandError`, or let the schema reject the value |
| `.action()` that prints | `run()` that returns the text. Runa prints it |
| `console.error()` and `process.exit(1)` | `throw new CommandError(message)`, which exits with 1, or with `exitCode` |
| `.command('deploy')` with its own options | `defineCLI({ commands: { deploy } })`, one `defineCommand` each |
| Nested commands | Nested objects: `commands: { config: { get, set } }` |
| `.hook('preAction')` | Middleware, or a plugin with a hook |
| `program.parse()` | `runCLI(command)` for one command, `cli.run()` for several |

What changes in how you write it:

- **Options in camelCase.** You write `textColor`, and people type `--text-color`. In commander it's the same, so this part looks familiar. `--textColor` is an error that points to `--text-color`.
- **Validation is the schema.** In commander, the color check lived in `.action()`. In Runa it's `.regex()`, and a wrong value is a usage error, exit 2, before `run()` starts. You never get a value of the wrong type.
- **Types come from the schema.** In commander, `options` is `any` unless you write its type. In Runa, `options.style` is `'flat' | 'round'`, and `renderBadge(args.label, options)` is checked when you compile.
- **`run()` returns, it doesn't print.** Return the text and Runa writes it to stdout. If you print and return, both show up, so print progress with `console.error`.
- **Two files.** `cli.ts` exports the command and `main.ts` starts it, so the tests can import the command without running it.

## 3. Errors

Commander CLIs often end with `console.error()` and `process.exit(1)`. In Runa, throw:

- **`CommandError`** for a message meant for the person using your CLI. Runa prints it as you wrote it and exits with 1, or with the `exitCode` you pass.
- **Nothing**, if the schema can catch the mistake. Runa exits with 2 and adds a line pointing to `--help`.
- **Any other error** is shown as `Unexpected error in 'badge': <message>`, with a hint to set `RUNA_DEBUG=1`. That's for bugs, not for messages you planned.

Avoid `process.exit()` inside `run()`: it skips what Runa does after the command, such as plugin cleanup.

## 4. Tests

If your tests run the built program, they keep working: only the exit codes and messages in section 5 change. To test without a subprocess, import the command and use `testCLI()`, which returns the exit code, stdout and stderr:

<!-- file: examples/from-commander/src/cli.test.ts -->
```ts
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { testCLI } from '@runa-cmd/core/testing';
import { renderBadge } from './badge.ts';
import { badge } from './cli.ts';

const flat = { style: 'flat', textColor: '#ffffff', uppercase: false } as const;

test('prints the badge', async () => {
	const result = await testCLI(badge, ['beta']);
	assert.equal(result.code, 0);
	assert.equal(result.stdout, `${renderBadge('beta', flat)}\n`);
});

test('reads kebab-case flags and short aliases', async () => {
	const result = await testCLI(badge, ['beta', '-s', 'round', '--text-color', '#000000']);
	assert.equal(
		result.stdout,
		`${renderBadge('beta', { ...flat, style: 'round', textColor: '#000000' })}\n`,
	);
});

test('writes to a file with -o', async () => {
	const file = join(mkdtempSync(join(tmpdir(), 'badge-')), 'beta.svg');
	const result = await testCLI(badge, ['beta', '-o', file]);
	assert.equal(result.stdout, `Saved to ${file}\n`);
	assert.equal(readFileSync(file, 'utf8'), renderBadge('beta', flat));
});

test('a mistake in the call is exit 2', async () => {
	for (const argv of [[], ['beta', '--style', 'square'], ['beta', '--text-color', 'red']]) {
		const result = await testCLI(badge, argv);
		assert.equal(result.code, 2, argv.join(' '));
	}
});

test('a file it cannot write is exit 1, with the reason', async () => {
	const result = await testCLI(badge, ['beta', '-o', join(tmpdir(), 'missing-dir', 'beta.svg')]);
	assert.equal(result.code, 1);
	assert.match(result.stderr, /^Cannot write /);
});
```

## 5. What changes for the people using your CLI

The output for a valid command stays the same. What changes is how the CLI answers a mistake, and that's what breaks scripts. These are both versions of `badge`, run with the same arguments:

| Call | commander | Runa |
|---|---|---|
| `badge beta` | 0 | 0, same output |
| `badge` | 1, `missing required argument 'label'` | **2**, `Missing required argument: <label>` |
| `badge beta extra` | 1, `too many arguments` | **2**, `Unexpected positional argument: 'extra'` |
| `badge beta --nope` | 1, `unknown option '--nope'` | **2**, `Unknown option: --nope` |
| `badge beta --style` | 1, `argument missing` | **2**, `Option -s, --style requires a value` |
| `badge beta --style square` | 1, `argument 'square' is invalid` | **2**, `Expected one of: flat, round` |
| `badge beta --text-color red` | 1, your message | **2**, your message |
| `badge beta -o /missing/x.svg` | 1 | 1, same message |
| `badge -V` | 0, prints the version | **2**: only `--version` exists |
| `badge beta --no-uppercase` | 1, unknown option | **0**: every boolean has `--no-` |

So:

1. **Usage errors are exit 2, not 1.** A script that checks for exactly 1 has to accept 2. Failures while running, like a file that can't be written, are still 1.
2. **`-V` is gone.** `--version` works the same.
3. **Messages and help change.** They're worded differently, help has another layout and lists the allowed values, and most usage errors end with `Run 'badge --help' for usage.` Scripts shouldn't read them, and a major version is the moment to say so.
4. **Some mistakes start failing.** In qr-plus, an invalid `--format` used to exit with 0 and create no file. Once its values were a `z.enum()`, it became exit 2. Look for these cases, because they'll appear as new errors after you upgrade.

Write it down for the people who use your CLI, as qr-plus did in its [migration guide](https://github.com/jrodrigopuca/qr-code-generator/blob/master/docs/MIGRATION.md): the exit codes, `-V`, and each value that used to pass and now fails.

## What you get

What commander didn't give `badge`, with no extra code:

- `--help` built from the schemas, with types, defaults and allowed values.
- `--no-` for every boolean, and a suggestion for a misspelled flag.
- Exit 2 for a usage error and 127 for an unknown command, so a script can tell them apart from a failure.
- Tests without a subprocess with `testCLI()`.
- Its command as an agent's tool, with [`@runa-cmd/mcp`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/mcp), and shell completions with [`@runa-cmd/completions`](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/completions).

[Runa and the alternatives](./runa-compared.md) compares both tools on a smaller CLI, including size and startup time, where commander is lighter.
