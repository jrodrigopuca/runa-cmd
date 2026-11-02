// A real CLI to see how a command gets its name (ADR-0043).
import { defineCLI, defineCommand, runCLI } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';

const named = defineCommand({
	meta: { description: 'Has no name of its own' },
	options: { level: z.string().default('low') },
	run: ({ command, options }) => console.log(JSON.stringify({ name: command.name, options })),
});
const declared = defineCommand({
	meta: { name: 'with-output', description: 'Repeats its name' },
	run: ({ command }) => console.log(command.name),
});
const other = defineCommand({
	meta: { name: 'something-else', description: 'Says another name' },
	run() {},
});

const broken = {
	camel: { withOutput: named },
	snake: { with_output: named },
	upper: { Build: named },
	group: { myGroup: { named } },
	nested: { group: { withOutput: named } },
	mismatch: { actual: other },
	dot: { 'with.dot': named },
}[process.env.BROKEN];

if (process.env.ROOT === 'nameless') {
	await runCLI(named);
} else if (process.env.ROOT) {
	await runCLI(declared);
} else {
	await defineCLI({
		meta: { name: 'names', version: '1.0.0' },
		config: process.env.CONFIG_DIR
			? { name: 'names', searchPaths: [process.env.CONFIG_DIR] }
			: undefined,
		commands: broken ?? {
			'with-output': declared,
			'no-name': named,
			build2: named,
			tools: { 'add-tag': named },
		},
	}).run();
}
