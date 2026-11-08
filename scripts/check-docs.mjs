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
import { adrStatusMismatch, implementationTasks } from './adr-status.mjs';
import { codeFiles, missingForCode } from './commit-rule.mjs';
import { peerMismatches, readFixed, readPackages } from './peers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const RESEARCH = join(DOCS, 'research');
const GUIDES = join(ROOT, 'guides');
/** Guides are read on GitHub and npm, so they link to the repo with full URLs. */
const REPO_LINK = /^https:\/\/github\.com\/jrodrigopuca\/runa-cmd\/(?:tree|blob)\/main\/([^#]*)(#.*)?$/;
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

/** A link to this repo on GitHub, as the local path it points to. */
function repoPath(target) {
	const match = target.match(REPO_LINK);
	return match ? `${join(ROOT, match[1])}${match[2] ?? ''}` : undefined;
}

function checkLinks(file, text) {
	for (const [, link] of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
		const target = repoPath(link) ?? link;
		if (/^[a-z]+:/i.test(target)) continue;
		const [path, anchor] = target.split('#');
		const local = path ? resolve(dirname(file), path) : file;
		// A folder on GitHub shows its README, and its anchors are the README's
		const dest =
			existsSync(local) && statSync(local).isDirectory() && anchor
				? join(local, 'README.md')
				: local;
		if (!existsSync(dest)) {
			fail(rel(file), `broken link ${link}`);
			continue;
		}
		if (anchor && statSync(dest).isFile() && !anchorsOf(dest).has(decodeURIComponent(anchor))) {
			fail(rel(file), `broken anchor ${link}`);
		}
	}
}

/**
 * A guide shows code from a project in examples/, which runs its tests in CI.
 * The block after `<!-- file: path -->` must be that file, so it can't drift.
 */
function checkSnippets(file, raw) {
	const markers = [...raw.matchAll(/<!-- file: (\S+) -->/g)];
	const blocks = [...raw.matchAll(/<!-- file: (\S+) -->\n```[\w-]*\n([\s\S]*?)\n```/g)];
	if (markers.length !== blocks.length) {
		fail(rel(file), 'a `<!-- file: -->` marker must be followed by a code block');
	}
	for (const [, path, block] of blocks) {
		const source = join(ROOT, path);
		if (!existsSync(source)) {
			fail(rel(file), `shows a missing file ${path}`);
		} else if (readFileSync(source, 'utf8').trimEnd() !== block.trimEnd()) {
			fail(rel(file), `the block for ${path} differs from the file`);
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

function checkAdrs(taskStates) {
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
		const row = index.split('\n').find((line) => line.includes(`(./${name})`)) ?? '';
		const mismatch = adrStatusMismatch(
			implementationTasks(text),
			row.includes('pendiente de código'),
			taskStates,
		);
		if (mismatch) fail(`docs/adr/README.md`, `ADR-${number}: ${mismatch}`);
	}
	for (const [, name] of index.matchAll(/\(\.\/(\d{4}-[^)]+\.md)\)/g)) {
		if (!files.includes(name)) fail('docs/adr/README.md', `lists a missing ADR ${name}`);
	}
}

/** Every task, with its state. */
function checkBacklog() {
	const text = readFileSync(join(DOCS, 'backlog.md'), 'utf8');
	const ids = new Map();
	const sections = text.split(/^### (?=T-\d{3} )/m).slice(1);
	for (const section of sections) {
		const id = section.slice(0, 5);
		if (ids.has(id)) fail('docs/backlog.md', `repeated task ${id}`);
		const v1 = section.match(/\*\*v1:\*\* (.+)/)?.[1];
		const state = section.match(/\*\*Estado:\*\* (.+)/)?.[1];
		ids.set(id, state);
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
	return seen;
}

/** A closed issue leaves its row, so anything still citing it is stale. */
function checkIssueReferences(file, text, issues) {
	if (file.startsWith(RESEARCH)) return;
	for (const [id] of text.matchAll(/\bKI-\d{3}\b/g)) {
		if (!issues.has(id)) fail(rel(file), `cites closed or unknown issue ${id}`);
	}
}

function checkChange(label, files, message) {
	const missing = missingForCode(files);
	if (missing.length === 0) return;
	if (/^Process-Skip:\s*\S/m.test(message)) return;
	const docs = 'docs (docs/, a package README, guides/, README.md or VERSIONING.md)';
	const names = missing.map((what) => (what === 'docs' ? docs : what));
	fail(
		label,
		`changes ${codeFiles(files)[0]} without ${names.join(' or ')}. ` +
			'Update them, or add "Process-Skip: <reason>" to the commit message (docs/process.md).',
	);
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

const taskStates = checkBacklog();
const issues = checkKnownIssues(taskStates);
for (const file of [...walk(DOCS).filter((path) => path.endsWith('.md')), join(ROOT, 'AGENTS.md')]) {
	const text = withoutFences(readFileSync(file, 'utf8'));
	checkLinks(file, text);
	checkPaths(file, text);
	checkIssueReferences(file, text, issues);
}
checkAdrs(taskStates);

for (const file of existsSync(GUIDES) ? walk(GUIDES).filter((path) => path.endsWith('.md')) : []) {
	const raw = readFileSync(file, 'utf8');
	checkLinks(file, withoutFences(raw));
	checkSnippets(file, raw);
}

// A package README marks its examples the same way, so they can't drift from
// the code that runs them (T-227: the custom renderer example didn't compile)
for (const name of readdirSync(join(ROOT, 'packages'))) {
	const readme = join(ROOT, 'packages', name, 'README.md');
	if (existsSync(readme)) checkSnippets(readme, readFileSync(readme, 'utf8'));
}

// Until 1.0 a plugin's peer of core is core's version: a lower floor installs
// it with a core where its newer features do nothing (T-233)
for (const { name, found, expected } of peerMismatches(readPackages(), readFixed())) {
	fail(name, `peer of @runa-cmd/core is ${found}, expected ${expected}. Run: node scripts/peers.mjs --write`);
}

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
