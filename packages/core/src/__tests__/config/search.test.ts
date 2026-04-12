/**
 * Unit tests for config/search.ts — config file discovery
 *
 * Tests: searchConfig finds files in paths, tilde expansion, fallback behavior
 * References: Spec Section 8 — config search scenarios
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchConfig } from '../../config/search.js';
import type { ConfigLoader } from '../../types.js';

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
	access: vi.fn(),
}));

// Mock node:os for homedir
vi.mock('node:os', () => ({
	homedir: vi.fn(() => '/home/testuser'),
}));

const { access } = await import('node:fs/promises');
const mockedAccess = vi.mocked(access);

describe('searchConfig', () => {
	const jsonLoader: ConfigLoader = {
		extensions: ['.json'],
		load: vi.fn(),
	};

	const yamlLoader: ConfigLoader = {
		extensions: ['.yaml', '.yml'],
		load: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns null when no config file found', async () => {
		// All access calls reject (file not found)
		mockedAccess.mockRejectedValue(new Error('ENOENT'));

		const result = await searchConfig('myapp', [jsonLoader], ['.', '~']);

		expect(result).toBeNull();
	});

	it('finds config in the first search path', async () => {
		// First call succeeds (found in '.')
		mockedAccess.mockResolvedValueOnce(undefined);

		const result = await searchConfig('myapp', [jsonLoader], ['.', '~']);

		expect(result).not.toBeNull();
		expect(result!.filePath).toContain('myapp.config.json');
		expect(result!.loader).toBe(jsonLoader);
	});

	it('falls back to second search path', async () => {
		// First path fails, second succeeds
		mockedAccess
			.mockRejectedValueOnce(new Error('ENOENT')) // ./myapp.config.json
			.mockResolvedValueOnce(undefined); // ~/myapp.config.json

		const result = await searchConfig('myapp', [jsonLoader], ['.', '~']);

		expect(result).not.toBeNull();
		// The tilde should resolve to homedir
		expect(result!.filePath).toContain('/home/testuser');
		expect(result!.filePath).toContain('myapp.config.json');
	});

	it('checks all loader extensions per path', async () => {
		// All JSON checks fail, YAML succeeds in first path
		mockedAccess
			.mockRejectedValueOnce(new Error('ENOENT')) // ./myapp.config.json
			.mockRejectedValueOnce(new Error('ENOENT')) // ./myapp.config.yaml
			.mockResolvedValueOnce(undefined); // ./myapp.config.yml

		const result = await searchConfig('myapp', [jsonLoader, yamlLoader], ['.']);

		expect(result).not.toBeNull();
		expect(result!.filePath).toContain('myapp.config.yml');
		expect(result!.loader).toBe(yamlLoader);
	});

	it('returns first match when multiple files exist', async () => {
		// First call succeeds immediately
		mockedAccess.mockResolvedValueOnce(undefined);

		const result = await searchConfig('myapp', [jsonLoader, yamlLoader], ['.']);

		// Should find JSON first since jsonLoader is first in the array
		expect(result!.filePath).toContain('myapp.config.json');
		expect(result!.loader).toBe(jsonLoader);
	});

	it('resolves ~ to homedir', async () => {
		// Fail in current dir, succeed in home dir
		mockedAccess
			.mockRejectedValueOnce(new Error('ENOENT')) // ./myapp.config.json
			.mockResolvedValueOnce(undefined); // ~/myapp.config.json

		const result = await searchConfig('myapp', [jsonLoader], ['.', '~']);

		expect(result).not.toBeNull();
		expect(result!.filePath).toMatch(/^\/home\/testuser\//);
	});

	it('handles empty search paths', async () => {
		const result = await searchConfig('myapp', [jsonLoader], []);
		expect(result).toBeNull();
	});

	it('handles empty loaders', async () => {
		const result = await searchConfig('myapp', [], ['.']);
		expect(result).toBeNull();
	});
});
