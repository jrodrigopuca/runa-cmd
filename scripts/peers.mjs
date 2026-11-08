#!/usr/bin/env node
/**
 * Until 1.0, each plugin's peer of core is core's current version (T-233).
 *
 *   node scripts/peers.mjs           Lists the peers that don't match, and fails
 *   node scripts/peers.mjs --write   Sets them to ^ plus core's version
 *
 * The Release workflow runs --write after `changeset version`, through
 * `pnpm version-packages`: changesets never sees the edit, so it doesn't
 * escalate the release to a major. Zero dependencies, like check-docs.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = '@runa-cmd/core';

/**
 * The packages whose peer of core is not `^` plus core's version. Only a package
 * in the same `fixed` group as core is checked: those release together.
 */
export function peerMismatches(packages, fixed) {
	const core = packages.find((pkg) => pkg.name === CORE);
	const group = fixed.find((names) => names.includes(CORE));
	if (!core || !group) return [];

	const expected = `^${core.version}`;
	return packages
		.filter((pkg) => group.includes(pkg.name))
		.map((pkg) => ({ name: pkg.name, found: pkg.peerDependencies?.[CORE], expected }))
		.filter(({ found }) => found !== undefined && found !== expected);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** The published packages, with the path of their package.json. */
export function readPackages() {
	const dir = join(ROOT, 'packages');
	return readdirSync(dir).map((name) => {
		const path = join(dir, name, 'package.json');
		return { ...readJson(path), path };
	});
}

export function readFixed() {
	return readJson(join(ROOT, '.changeset', 'config.json')).fixed ?? [];
}

function main() {
	const packages = readPackages();
	const mismatches = peerMismatches(packages, readFixed());

	if (process.argv.includes('--write')) {
		for (const { name, expected } of mismatches) {
			const { path } = packages.find((pkg) => pkg.name === name);
			const text = readFileSync(path, 'utf8');
			const json = JSON.parse(text);
			json.peerDependencies[CORE] = expected;
			const indent = text.match(/^\s+(?=")/m)?.[0] ?? '\t';
			writeFileSync(path, `${JSON.stringify(json, null, indent)}\n`);
			console.log(`${name}: peer of ${CORE} is now ${expected}`);
		}
		return;
	}

	for (const { name, found, expected } of mismatches) {
		console.error(`${name}: peer of ${CORE} is ${found}, expected ${expected}`);
	}
	if (mismatches.length > 0) {
		console.error('Run: node scripts/peers.mjs --write');
		process.exitCode = 1;
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
