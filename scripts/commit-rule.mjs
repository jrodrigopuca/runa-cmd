/**
 * The commit rule of docs/process.md: a commit that changes the code of a
 * package brings its docs and its tests. Docs are wherever they belong: docs/,
 * a package's README, the guides, the root README or VERSIONING.md.
 * Zero dependencies, like check-docs.mjs.
 */

const isCode = (file) => /^packages\/[^/]+\/src\//.test(file) && !file.includes('/__tests__/');
const isTest = (file) => file.includes('/__tests__/');
const isDocs = (file) =>
	file.startsWith('docs/') ||
	file.startsWith('guides/') ||
	/^packages\/[^/]+\/README\.md$/.test(file) ||
	file === 'README.md' ||
	file === 'VERSIONING.md';

/** The code a commit changes, which is what the rule is about. */
export const codeFiles = (files) => files.filter(isCode);

/** What a commit that changes code lacks: 'docs', 'tests', both or nothing. */
export function missingForCode(files) {
	if (codeFiles(files).length === 0) return [];
	const missing = [];
	if (!files.some(isDocs)) missing.push('docs');
	if (!files.some(isTest)) missing.push('tests');
	return missing;
}
