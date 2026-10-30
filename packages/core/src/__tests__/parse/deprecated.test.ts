/**
 * Unit tests for deprecation warnings (parse/deprecated.ts).
 * The end-to-end behavior lives in acceptance/failure-exit.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { deprecationWarnings } from '../../parse/deprecated.js';

const optionMeta = {
	force: { env: 'FORCE', deprecated: 'Use --confirm instead' },
	confirm: {},
};
const WARNING = 'Warning: --force is deprecated. Use --confirm instead';

const warnings = (input: Partial<Parameters<typeof deprecationWarnings>[0]>) =>
	deprecationWarnings({ provided: [], longAliasMap: {}, optionMeta, env: {}, ...input });

describe('deprecationWarnings', () => {
	it('warns when the option comes from the CLI', () => {
		expect(warnings({ provided: ['force'] })).toEqual([WARNING]);
	});

	it('resolves a long alias to the option it stands for', () => {
		expect(warnings({ provided: ['yes'], longAliasMap: { yes: 'force' } })).toEqual([WARNING]);
	});

	it('warns when the option comes from the environment', () => {
		expect(warnings({ env: { FORCE: '1' } })).toEqual([WARNING]);
	});

	it('warns when the option comes from a config file', () => {
		expect(warnings({ configValues: { force: true } })).toEqual([WARNING]);
	});

	it('stays quiet for options that are not deprecated or not used', () => {
		expect(warnings({ provided: ['confirm'] })).toEqual([]);
	});

	it('stays quiet without option metadata', () => {
		expect(warnings({ provided: ['force'], optionMeta: undefined })).toEqual([]);
	});
});
