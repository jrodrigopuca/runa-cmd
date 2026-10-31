import { describe, expect, it } from 'vitest';
import { flagName } from '../flag-name.js';

describe('flagName', () => {
	it.each([
		['verbose', 'verbose'],
		['darkColor', 'dark-color'],
		['darkModuleColor', 'dark-module-color'],
		['outputURL', 'output-url'],
		['HTTPServer', 'http-server'],
		['URL', 'url'],
		['oauth2Token', 'oauth2-token'],
		['size2x', 'size2x'],
		['dark-color', 'dark-color'],
		['Dark-Color', 'Dark-Color'],
		['dark_color', 'dark_color'],
		['x', 'x'],
		['V', 'V'],
	])('%s → %s', (key, flag) => {
		expect(flagName(key)).toBe(flag);
	});
});
