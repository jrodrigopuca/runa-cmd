// The peer rule of T-233: until 1.0, each plugin's peer of core is core's
// current version. Run with `node --test scripts/`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { peerMismatches } from './peers.mjs';

const fixed = [['@runa-cmd/core', '@runa-cmd/help', '@runa-cmd/mcp', '@runa-cmd/create']];
const core = { name: '@runa-cmd/core', version: '0.2.0-beta.7' };
const plugin = (name, peer) => ({
	name,
	version: '0.2.0-beta.7',
	peerDependencies: { '@runa-cmd/core': peer, zod: '^4.0.0' },
});

test('a peer at the current version of core passes', () => {
	const packages = [core, plugin('@runa-cmd/help', '^0.2.0-beta.7')];
	assert.deepEqual(peerMismatches(packages, fixed), []);
});

test('a peer below the current version of core fails, naming what it should be', () => {
	const packages = [core, plugin('@runa-cmd/help', '^0.2.0-beta.1')];
	assert.deepEqual(peerMismatches(packages, fixed), [
		{ name: '@runa-cmd/help', found: '^0.2.0-beta.1', expected: '^0.2.0-beta.7' },
	]);
});

test('a package without a peer of core is not checked', () => {
	const packages = [core, { name: '@runa-cmd/create', version: '0.2.0-beta.7' }];
	assert.deepEqual(peerMismatches(packages, fixed), []);
});

test('outside the fixed group, a peer keeps its own range', () => {
	const packages = [core, plugin('@runa-cmd/other', '^0.2.0-beta.1')];
	assert.deepEqual(peerMismatches(packages, fixed), []);
});

test('without core in the group, nothing is checked', () => {
	const packages = [core, plugin('@runa-cmd/help', '^0.2.0-beta.1')];
	assert.deepEqual(peerMismatches(packages, [['@runa-cmd/help', '@runa-cmd/mcp']]), []);
});
