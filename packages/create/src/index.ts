#!/usr/bin/env node
/**
 * @runa-cmd/create — `npm create @runa-cmd my-tool`
 *
 * No dependencies, Runa included: `npm create` downloads this every time, and
 * it should take a moment, not Zod.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { CreateError, createProject, nextSteps } from './create.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templateDir = join(root, 'template');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const { version } = readJson(join(root, 'package.json'));
// The core this was built with, which isn't always this package's version
const runaVersion: string = readJson(join(templateDir, 'runa.json')).core;

const USAGE = `Create a CLI made with Runa.

Usage: npm create @runa-cmd <name>

  <name>          The folder, the package and the command, as in my-tool
  -h, --help      Show this
  -v, --version   Show the version`;

function main(): number {
	let parsed: ReturnType<typeof parseArgs>;
	try {
		parsed = parseArgs({
			allowPositionals: true,
			options: {
				help: { type: 'boolean', short: 'h' },
				version: { type: 'boolean', short: 'v' },
			},
		});
	} catch (error) {
		console.error(`${(error as Error).message}\n\n${USAGE}`);
		return 2;
	}

	const { values, positionals } = parsed;
	if (values.help) {
		console.log(USAGE);
		return 0;
	}
	if (values.version) {
		console.log(version);
		return 0;
	}

	const [name, ...extra] = positionals;
	if (!name || extra.length > 0) {
		console.error(USAGE);
		return 2;
	}

	try {
		createProject({ name, cwd: process.cwd(), templateDir, runaVersion });
	} catch (error) {
		if (!(error instanceof CreateError)) throw error;
		console.error(error.message);
		return 2;
	}

	console.log(nextSteps(name, process.env.npm_config_user_agent));
	return 0;
}

process.exitCode = main();
