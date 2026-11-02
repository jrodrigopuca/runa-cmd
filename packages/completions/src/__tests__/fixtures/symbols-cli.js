#!/usr/bin/env node
// A real CLI whose text is hostile to a completion script.
import { defineCLI, defineCommand } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { completionsPlugin } from '../../../dist/index.js';

const show = defineCommand({
	meta: { description: 'List items [beta]: all of them' },
	options: {
		mode: z.enum(['fast', 'very slow']).describe('Mode [x]: how fast'),
		limit: z.number().optional().describe("It's the limit (max: 10)"),
	},
	run() {},
});
const plain = defineCommand({
	meta: { description: 'Plain' },
	options: { level: z.enum(['low', 'high']).optional() },
	run() {},
});

await defineCLI({
	meta: { name: 'sym', version: '1.0.0' },
	commands: { show, plain, group: { 'add-tag': plain } },
	plugins: [completionsPlugin()],
}).run();
