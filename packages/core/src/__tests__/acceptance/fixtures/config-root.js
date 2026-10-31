// A CLI of one command: there is no command name to write in the file.
import { defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const paint = defineCommand({
	meta: { name: 'paint', description: 'Paint' },
	options: { darkColor: z.string().default('#000') },
	run: ({ options }) => console.log(JSON.stringify({ options })),
});

await runCLI(paint, {
	config: process.env.CONFIG_DIR
		? { name: 'paint', searchPaths: [process.env.CONFIG_DIR] }
		: undefined,
});
