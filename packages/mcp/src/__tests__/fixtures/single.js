// A real single-command CLI exposed over MCP through runCLI.
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { mcpPlugin } from '../../../dist/index.js';

const encode = defineCommand({
	meta: { name: 'encode', version: '1.2.3', description: 'Encode a text' },
	args: { content: z.string().describe('Text to encode') },
	run: ({ args }) => `encoded: ${args.content}`,
});

await runCLI(encode, { plugins: [mcpPlugin()] });
