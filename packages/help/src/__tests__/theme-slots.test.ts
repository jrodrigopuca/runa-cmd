/**
 * Each slot of the theme changes what the README says it does (T-238,
 * ADR-0029). error and success are for a renderer of your own: the default
 * one shows no errors and no successes, since core writes those.
 */
import type { CLISchema, CommandSchema } from '@runa-cmd/core';
import { describe, expect, it } from 'vitest';
import { defaultRenderer } from '../render.js';
import { resolveTheme } from '../theme.js';
import type { RenderContext, Theme } from '../types.js';

const TRUECOLOR: RenderContext = { colorDepth: 'truecolor', termWidth: 100 };

// A color per slot, so each one can only come from its slot
const slots: Theme = {
	primary: '#010101',
	secondary: '#020202',
	muted: '#030303',
	error: '#040404',
	warning: '#050505',
	success: '#060606',
};
const theme = resolveTheme(slots, TRUECOLOR);

const deploy: CommandSchema = {
	name: 'deploy',
	description: 'Deploy a service',
	fullPath: ['deploy'],
	args: [{ name: 'service', type: 'string', required: true, isVariadic: false }],
	options: [
		{ name: 'env', flag: 'env', type: 'string', required: true, alias: ['-e'], env: 'DEPLOY_ENV' },
		{ name: 'replicas', flag: 'replicas', type: 'number', required: false, defaultValue: 2 },
		{ name: 'region', flag: 'region', type: 'string', required: false, deprecated: 'use --zone' },
	],
	hasOutput: false,
};

const cli: CLISchema = {
	meta: { name: 'tool', version: '1.0.0', description: 'A tool' },
	commands: [deploy],
	globalOptions: [],
};

const render = (schema: CLISchema | CommandSchema) =>
	defaultRenderer({ schema, theme, colorDepth: 'truecolor', termWidth: 100 });

describe('each slot of the theme', () => {
	it('primary colors the titles and the command names', () => {
		const help = render(cli);
		expect(help).toContain(`${theme.primary}COMMANDS`);
		expect(help).toContain(`${theme.primary}deploy`);
	});

	it('secondary colors the flags, the arguments and (required)', () => {
		const help = render(deploy);
		expect(help).toContain(`${theme.secondary}-e, --env`);
		expect(help).toContain(`${theme.secondary}<service>`);
		expect(help).toContain(`${theme.secondary}(required)`);
	});

	it('muted colors the defaults and the variables', () => {
		const help = render(deploy);
		expect(help).toContain(`${theme.muted}[default: 2]`);
		expect(help).toContain(`${theme.muted}[env: DEPLOY_ENV]`);
	});

	it('warning colors what is deprecated', () => {
		expect(render(deploy)).toContain(`${theme.warning}(deprecated: use --zone)`);
	});

	it('error and success are not used by the default renderer', () => {
		const help = render(cli) + render(deploy);
		expect(help).not.toContain(theme.error);
		expect(help).not.toContain(theme.success);
	});

	it('no color is fixed: without a theme color, nothing is yellow', () => {
		const yellow = '\x1b[33m';
		expect(render(cli) + render(deploy)).not.toContain(yellow);
	});
});
