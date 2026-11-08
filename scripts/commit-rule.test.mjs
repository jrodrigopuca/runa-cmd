// The commit rule of docs/process.md: code in packages/*/src travels with its
// docs and tests. Run with `node --test scripts/`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingForCode } from './commit-rule.mjs';

const code = 'packages/core/src/index.ts';
const testFile = 'packages/core/src/__tests__/types.test-d.ts';

test('code with docs/ and tests passes', () => {
	assert.deepEqual(missingForCode([code, testFile, 'docs/backlog.md']), []);
});

test("a package's README counts as its docs", () => {
	assert.deepEqual(missingForCode([code, testFile, 'packages/core/README.md']), []);
});

test('a guide, the root README and VERSIONING.md count as docs', () => {
	for (const doc of ['guides/testing.md', 'README.md', 'VERSIONING.md']) {
		assert.deepEqual(missingForCode([code, testFile, doc]), [], doc);
	}
});

test('code without any docs still fails', () => {
	assert.deepEqual(missingForCode([code, testFile]), ['docs']);
});

test('code without tests still fails, whatever the docs', () => {
	assert.deepEqual(missingForCode([code, 'packages/core/README.md']), ['tests']);
});

test('a README of a folder that is not a package does not count', () => {
	assert.deepEqual(missingForCode([code, testFile, 'packages/core/src/README.md']), ['docs']);
});

test('a commit without code needs nothing', () => {
	assert.deepEqual(missingForCode(['docs/backlog.md']), []);
	assert.deepEqual(missingForCode([testFile]), []);
});
