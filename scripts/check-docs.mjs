#!/usr/bin/env node
/**
 * Verifies docs/ stays consistent with the repo (docs/process.md, ADR-0026).
 *
 *   node scripts/check-docs.mjs                     Static checks only
 *   node scripts/check-docs.mjs --staged --message <file>   Plus the staged commit
 *   node scripts/check-docs.mjs --range <from>..<to>        Plus every commit in the range
 *
 * Zero dependencies, so it runs before `pnpm install` finishes in any context.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const RESEARCH = join(DOCS, 'research');
const TASK_STATES = ['Pendiente', 'Decisión pendiente', 'En curso', 'Hecho', 'Descartado'];
const V1_VALUES = ['Requerido', 'Opcional'];
const ADR_FIELDS = ['Estado', 'Drivers', 'Decisión', 'Costo aceptado', 'Revisar si'];

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);
const rel = (path) => relative(ROOT, path);

function git(...args) {
	return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/** Removes fenced code so examples are not read as links or paths. */
function withoutFences(text) {
	return text.replace(/^```[\s\S]*?^```$/gm, '');
}

/** GitHub-style heading anchor. */
function slug(heading) {
	return heading
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, '')
		.replace(/\s/g, '-');
}

function anchorsOf(file) {
	const text = withoutFences(readFileSync(file, 'utf8'));
	return new Set(
		[...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1].trim())),
	);
}

function checkLinks(file, text) {
	for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
		if (/^[a-z]+:/i.test(target)) continue;
		const [path, anchor] = target.split('#');
		const dest = path ? resolve(dirname(file), path) : file;
		if (!existsSync(dest)) {
			fail(rel(file), `broken link ${target}`);
			continue;
		}
		if (anchor && statSync(dest).isFile() && !anchorsOf(dest).has(decodeURIComponent(anchor))) {
			fail(rel(file), `broken anchor ${target}`);
		}
	}
}

function checkPaths(file, text) {
	if (file.startsWith(RESEARCH)) return;
	for (const [, path] of text.matchAll(/`((?:packages|examples)\/[\w./-]+?)(?::\d+)?`/g)) {
		if (!path.includes('*') && !existsSync(join(ROOT, path))) {
			fail(rel(file), `names a missing path ${path}`);
		}
	}
}

function checkAdrs() {
	const dir = join(DOCS, 'adr');
	const index = readFileSync(join(dir, 'README.md'), 'utf8');
	const files = readdirSync(dir).filter((name) => /^\d{4}-.+\.md$/.test(name));
	const numbers = new Set();
	for (const name of files) {
		const number = name.slice(0, 4);
		if (numbers.has(number)) fail(`docs/adr/${name}`, `repeated number ${number}`);
		numbers.add(number);
		if (!index.includes(`(./${name})`)) fail(`docs/adr/${name}`, 'missing from the index');
		const text = readFileSync(join(dir, name), 'utf8');
		if (!text.startsWith(`# ADR-${number}: `)) fail(`docs/adr/${name}`, 'title must match number');
		for (const field of ADR_FIELDS) {
			if (!text.includes(`**${field}:**`)) fail(`docs/adr/${name}`, `missing field ${field}`);
		}
	}
	for (const [, name] of index.matchAll(/\(\.\/(\d{4}-[^)]+\.md)\)/g)) {
		if (!files.includes(name)) fail('docs/adr/README.md', `lists a missing ADR ${name}`);
	}
}

function checkBacklog() {
	const text = readFileSync(join(DOCS, 'backlog.md'), 'utf8');
	const ids = new Set();
	const sections = text.split(/^### (?=T-\d{3} )/m).slice(1);
	for (const section of sections) {
		const id = section.slice(0, 5);
		if (ids.has(id)) fail('docs/backlog.md', `repeated task ${id}`);
		ids.add(id);
		const v1 = section.match(/\*\*v1:\*\* (.+)/)?.[1];
		const state = section.match(/\*\*Estado:\*\* (.+)/)?.[1];
		if (!V1_VALUES.includes(v1)) fail('docs/backlog.md', `${id} has invalid v1: ${v1}`);
		if (!TASK_STATES.includes(state)) fail('docs/backlog.md', `${id} has invalid state: ${state}`);
		if (!section.includes('**Criterios de aceptación:**')) {
			fail('docs/backlog.md', `${id} has no acceptance criteria`);
		}
		const row = text.match(new RegExp(`\\| ${id} \\|.*\\| (.+?) \\|$`, 'm'));
		if (!row) fail('docs/backlog.md', `${id} is missing from the summary`);
		else if (row[1] !== state) fail('docs/backlog.md', `${id} summary says ${row[1]}, task says ${state}`);
	}
	return ids;
}

function checkKnownIssues(taskIds) {
	const text = readFileSync(join(DOCS, 'known-issues.md'), 'utf8');
	const seen = new Set();
	for (const line of text.split('\n')) {
		const id = line.match(/^\| (KI-\d{3}) /)?.[1];
		if (!id) continue;
		if (seen.has(id)) fail('docs/known-issues.md', `repeated issue ${id}`);
		seen.add(id);
		const task = line.match(/\[(T-\d{3})\]/)?.[1];
		if (!task) fail('docs/known-issues.md', `${id} has no task`);
		else if (!taskIds.has(task)) fail('docs/known-issues.md', `${id} points to unknown ${task}`);
	}
}

function checkChange(label, files, message) {
	const code = files.filter(
		(file) => /^packages\/[^/]+\/src\//.test(file) && !file.includes('/__tests__/'),
	);
	if (code.length === 0) return;
	if (/^Process-Skip:\s*\S/m.test(message)) return;
	const missing = [];
	if (!files.some((file) => file.startsWith('docs/'))) missing.push('docs/');
	if (!files.some((file) => file.includes('/__tests__/'))) missing.push('tests');
	if (missing.length > 0) {
		fail(
			label,
			`changes ${code[0]} without ${missing.join(' or ')}. ` +
				'Update them, or add "Process-Skip: <reason>" to the commit message (docs/process.md).',
		);
	}
}

function checkRange(range) {
	const commits = git('rev-list', '--no-merges', range).split('\n').filter(Boolean);
	for (const sha of commits) {
		const files = git('show', '--name-only', '--format=', sha).split('\n').filter(Boolean);
		checkChange(`commit ${sha.slice(0, 7)}`, files, git('show', '-s', '--format=%B', sha));
	}
}

const args = process.argv.slice(2);
const option = (name) => {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
};

for (const file of [...walk(DOCS).filter((path) => path.endsWith('.md')), join(ROOT, 'AGENTS.md')]) {
	const text = withoutFences(readFileSync(file, 'utf8'));
	checkLinks(file, text);
	checkPaths(file, text);
}
checkAdrs();
checkKnownIssues(checkBacklog());

if (args.includes('--staged')) {
	const files = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
	const messageFile = option('--message');
	checkChange('staged commit', files, messageFile ? readFileSync(messageFile, 'utf8') : '');
}
const range = option('--range');
if (range) checkRange(range);

if (errors.length > 0) {
	console.error(`docs:check failed (${errors.length}):`);
	for (const error of errors) console.error(`  - ${error}`);
	process.exit(1);
}
console.log('docs:check passed');
