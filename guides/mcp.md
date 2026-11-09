# Your CLI as an agent's tools

With `@runa-cmd/mcp`, `my-tool --mcp` starts an [MCP](https://modelcontextprotocol.io/) server, and every command becomes a tool an agent can call: Claude, Cursor, or any client that speaks MCP, with any model. The commands, their schemas and their checks are the ones you already wrote for people.

This guide builds `notes`, a small CLI that keeps notes in a file, and covers what changes when the one calling it is a model. The code is [`examples/mcp-notes`](https://github.com/jrodrigopuca/runa-cmd/tree/main/examples/mcp-notes), and its tests, which talk to it as an agent does, run in CI.

It assumes you know the basics from [Getting started](./getting-started.md).

## 1. Add the plugin

```bash
npm install @runa-cmd/mcp@beta
```

The plugin goes in `plugins`, and adds `--mcp`. Here is the whole CLI, explained piece by piece below:

<!-- file: examples/mcp-notes/src/cli.ts -->
```ts
import { CommandError, defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { mcpPlugin } from '@runa-cmd/mcp';
import { addNote, clearNotes, readNotes } from './notes.ts';

// Where the notes are kept is up to whoever runs the CLI: with env, it stays
// out of every tool's schema, so a model can't point it somewhere else
const fileOption = { file: z.string().describe('File where the notes are kept') };
const fileMeta = { file: { env: 'NOTES_FILE' } };

const note = z.object({ id: z.number(), text: z.string() });

const list = defineCommand({
	meta: { description: 'List the notes', options: fileMeta },
	options: fileOption,
	output: z.object({ notes: z.array(note) }),
	run: ({ options }) => ({ notes: readNotes(options.file) }),
	format: ({ notes }) => notes.map((n) => `${n.id}. ${n.text}`).join('\n') || 'No notes yet.',
});

const add = defineCommand({
	meta: { description: 'Add a note', options: fileMeta },
	args: { text: z.string().min(1).describe('What the note says') },
	options: fileOption,
	output: note,
	run: ({ args, options }) => addNote(options.file, args.text),
	format: (added) => `Added note ${added.id}.`,
});

const clear = defineCommand({
	meta: { description: 'Delete every note', options: fileMeta },
	options: fileOption,
	output: z.object({ deleted: z.number() }),
	run({ options }) {
		// A model reads this text, and nothing else, to decide what to do next
		if (readNotes(options.file).length === 0) {
			throw new CommandError('There are no notes to delete. Nothing changed.');
		}
		return { deleted: clearNotes(options.file) };
	},
	format: ({ deleted }) => `Deleted ${deleted} notes.`,
});

// Never ends on its own: it's for a person at a terminal, not for a tool call
const watch = defineCommand({
	meta: { description: 'Show how many notes there are, until stopped', options: fileMeta },
	options: fileOption,
	async run({ options, signal }) {
		const timer = setInterval(() => console.error(`${readNotes(options.file).length} notes`), 1000);
		await new Promise((resolve) => signal.addEventListener('abort', resolve));
		clearInterval(timer);
	},
});

export const cli = defineCLI({
	meta: { name: 'notes', version: '1.0.0', description: 'Keep short notes' },
	commands: { list, add, clear, watch },
	plugins: [
		mcpPlugin({
			exclude: ['watch'],
			instructions: 'Call list before add or clear, to see what is there.',
			tools: {
				list: { annotations: { readOnlyHint: true } },
				clear: {
					description: 'Delete every note. It cannot be undone: ask before calling it.',
					annotations: { destructiveHint: true },
				},
			},
		}),
	],
});
```

What the CLI does lives in its own file, [`src/notes.ts`](https://github.com/jrodrigopuca/runa-cmd/tree/main/examples/mcp-notes/src/notes.ts): three functions that read and write a JSON file, and know nothing about terminals or agents.

Try it as a person, and as a server:

```bash
export NOTES_FILE=~/notes.json
node src/main.ts add "Buy milk"
node src/main.ts list
node src/main.ts --mcp            # Waits for a client on stdin
```

To look at the server without a model, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector): `npx @modelcontextprotocol/inspector node src/main.ts --mcp`.

## 2. What the model sees

Each command is a tool with the same name, and a nested one like `config get` becomes `config_get`. Its arguments and options become one input schema, built from your Zod schemas, with each `.describe()` as the text the model reads. `add` takes `{ "text": "Buy milk" }`, and `.min(1)` rejects an empty note before `run()` starts, as it does at the terminal.

Every tool call runs your CLI again, as a separate process. Env vars, config files, hooks and middleware apply as they do for a person, and nothing is shared between calls.

## 3. Return data, not text

A person and a model want different things from `list`: a person wants lines to read, and a model wants data to work with. So `run()` returns the data, and `format` turns it into text for the terminal:

| Who runs `list` | Gets |
|---|---|
| A person | `1. Buy milk`, from `format` |
| A person with `--json` | `{ "notes": [...] }` |
| A model | The data, as `structuredContent`, because the command declares `output` |

`format` never runs for a tool. A command that only prints still works as a tool: the model gets what it printed, but it has to read it as text.

## 4. Choose what an agent gets

Every command is a tool unless you say otherwise, so decide which ones an agent should have:

- **`exclude`** removes a tool: it isn't listed and can't be called. It's the only real boundary. When you add a command, check whether it belongs here.
- **`tool: false`**, on a command, does the same from its definition, for commands that only make sense at a terminal.
- **`annotations`** tell the client what a tool does: `readOnlyHint` for `list`, `destructiveHint` for `clear`. They're hints, not access control: the client decides what to do with them, such as asking a person first.
- **`description`** replaces what the model reads, without changing your help. `clear` uses it to say that it can't be undone.

## 5. Commands that never end

A tool call is a process that has to end, and `watch` runs until someone stops it. As a tool, the call would never answer, until the client gave up and cancelled it. Leave it out with `exclude`, and if other tools need something running, say so in `instructions`, which the client gives the model next to the tools.

[local-beacon](https://github.com/jrodrigopuca/local-beacon) does this with its proxy: it excludes `proxy` and `watch`, and its `instructions` tell the model that the proxy must be running. The tools that remain talk to it.

## 6. What the operator decides

`notes` keeps its notes wherever `NOTES_FILE` says. An option that declares `env` belongs to whoever runs the server, not to the model:

- It isn't in any tool's schema, so a model can't point `notes` at another file. If a model sends it anyway, the call fails and nothing runs: `'file' is set by the operator of this server, so it can't be sent.` It doesn't run with a value the model didn't ask for.
- If it's missing, the server says so when it starts, on stderr, one line per tool: `mcpPlugin: tool 'add' can't run until the operator sets NOTES_FILE (--file).` A call to that tool fails with `class: "not_configured"`, and its text starts with `The operator of this server has to set NOTES_FILE. It isn't a value you can send.`, so the model doesn't take it as its own mistake, nor ask anyone for it.
- To let the model choose an option that declares `env`, list it in `expose`.

This is also where secrets go: a token in `env` never reaches the model. Fixed values are redacted from what a command prints, as a safety net, but what `run()` returns is not, so don't return secrets.

## 7. Errors the model reads

A failed call reaches the model as text, with `isError`. The client also gets `_meta['runa/error']`, with what happened, but many clients don't pass `_meta` to the model, so **write the text for the model**:

- A usage error, like an empty note, says what was wrong and that the command didn't run.
- A `CommandError` reaches the model as you wrote it. `clear` uses it to say that there was nothing to delete and nothing changed, so the model doesn't try again.
- Runa says what happened, not what to do next. Whether to retry is up to the model and whoever approves its calls, so if a command can fail halfway, make running it twice safe, or say what to do in your message.

## 8. Test it

Test what each command does with [`testCLI()`](./getting-started.md#4-test-it), as for any CLI:

<!-- file: examples/mcp-notes/src/cli.test.ts -->
```ts
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { testCLI } from '@runa-cmd/core/testing';
import { cli } from './cli.ts';

const env = () => ({ NOTES_FILE: join(mkdtempSync(join(tmpdir(), 'notes-')), 'notes.json') });

test('adds a note and lists it for a person', async () => {
	const vars = env();
	await testCLI(cli, ['add', 'Buy milk'], { env: vars });

	const result = await testCLI(cli, ['list'], { env: vars });
	assert.equal(result.stdout, '1. Buy milk\n');
});

test('gives the data with --json, as an agent gets it', async () => {
	const vars = env();
	await testCLI(cli, ['add', 'Buy milk'], { env: vars });

	const result = await testCLI(cli, ['list', '--json'], { env: vars });
	assert.deepEqual(JSON.parse(result.stdout), { notes: [{ id: 1, text: 'Buy milk' }] });
});

test('needs the file from whoever runs it', async () => {
	const result = await testCLI(cli, ['list'], { env: {} });
	assert.equal(result.code, 2);
	assert.match(result.stderr, /NOTES_FILE/);
});
```

Then test it as an agent's client does, with the [official MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) as a dev dependency: start `--mcp`, list the tools and call them. This is what catches a tool you forgot to exclude, or an option that leaked into a schema:

<!-- file: examples/mcp-notes/src/mcp.test.ts -->
```ts
// Talks to the CLI as an agent's client does: it starts `--mcp` and speaks MCP.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'test', version: '1.0.0' });

before(async () => {
	const file = join(mkdtempSync(join(tmpdir(), 'notes-')), 'notes.json');
	const env = Object.fromEntries(
		Object.entries({ ...process.env, NOTES_FILE: file }).filter(([, value]) => value !== undefined),
	) as Record<string, string>;
	await client.connect(
		new StdioClientTransport({ command: process.execPath, args: ['src/main.ts', '--mcp'], env }),
	);
});

after(() => client.close());

test('offers every command that ends, and not watch', async () => {
	const { tools } = await client.listTools();
	assert.deepEqual(tools.map((tool) => tool.name).sort(), ['add', 'clear', 'list']);
});

test('leaves the file out of the schema: it belongs to whoever runs the server', async () => {
	const { tools } = await client.listTools();
	const add = tools.find((tool) => tool.name === 'add');
	assert.deepEqual(Object.keys(add?.inputSchema.properties ?? {}), ['text']);
});

test('tells the model why a call failed, in the text it reads', async () => {
	const result = await client.callTool({ name: 'clear', arguments: {} });
	const [first] = result.content as { type: string; text: string }[];

	assert.equal(result.isError, true);
	assert.match(first?.text ?? '', /There are no notes to delete/);
});

test('adds a note and lists it as data', async () => {
	await client.callTool({ name: 'add', arguments: { text: 'Buy milk' } });
	const result = await client.callTool({ name: 'list', arguments: {} });

	assert.deepEqual(result.structuredContent, { notes: [{ id: 1, text: 'Buy milk' }] });
});
```

These tests prove what the model is offered, not that a model uses it well. For that, try it with a real client and a few prompts that don't name the tools.

## 9. Connect a client

Build and install the CLI first, as in [Getting started](./getting-started.md#5-ship-it): a client starts the command you give it, and Node doesn't run TypeScript from `node_modules`. Then tell the client how to start it, with the operator's values in its `env`.

In Claude Code:

```bash
claude mcp add notes -e NOTES_FILE=$HOME/notes.json -- notes --mcp
```

In a client configured with JSON, such as Claude Desktop:

```json
{
	"mcpServers": {
		"notes": {
			"command": "notes",
			"args": ["--mcp"],
			"env": { "NOTES_FILE": "/Users/you/notes.json" }
		}
	}
}
```

Each client documents where that file lives.

## Next

- Everything the plugin accepts, its error classes and its limits: the [`@runa-cmd/mcp` README](https://github.com/jrodrigopuca/runa-cmd/tree/main/packages/mcp).
- Why an operator's value stays out of the schema: [ADR-0032](https://github.com/jrodrigopuca/runa-cmd/blob/main/docs/adr/0032-postura-sobre-secretos.md).
