#!/usr/bin/env node
/**
 * @runa-cmd/create — `npm create @runa-cmd my-tool`
 *
 * No dependencies, Runa included: `npm create` downloads this every time, and
 * it should take a moment, not Zod. The command line is in cli.ts, so tests
 * can run it without a process.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from './cli.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templateDir = join(root, 'template');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const { version } = readJson(join(root, 'package.json'));
// The core this was built with, which isn't always this package's version
const runaVersion: string = readJson(join(templateDir, 'runa.json')).core;

process.exitCode = main(process.argv.slice(2), {
	version,
	templateDir,
	runaVersion,
	cwd: process.cwd(),
	userAgent: process.env.npm_config_user_agent,
	out: (text) => console.log(text),
	err: (text) => console.error(text),
});
