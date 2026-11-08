/**
 * Unit tests for config/loader.ts — JSON config loader
 *
 * Tests: jsonLoader reads/parses JSON, error handling
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonLoader } from '../../config/loader.js';

// We need to mock node:fs/promises for controlled tests
vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(),
}));

// Import the mocked module
const { readFile } = await import('node:fs/promises');
const mockedReadFile = vi.mocked(readFile);

describe('jsonLoader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns a ConfigLoader with .json extension', () => {
		const loader = jsonLoader();
		expect(loader.extensions).toEqual(['.json']);
	});

	it('loads and parses valid JSON', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockResolvedValueOnce('{"env":"staging","replicas":3}');

		const result = await loader.load('/path/to/config.json');

		expect(mockedReadFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
		expect(result).toEqual({ env: 'staging', replicas: 3 });
	});

	it('loads JSON with nested objects', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockResolvedValueOnce('{"deploy":{"target":"prod","replicas":5}}');

		const result = await loader.load('/path/to/config.json');

		expect(result).toEqual({ deploy: { target: 'prod', replicas: 5 } });
	});

	it('throws descriptive error on invalid JSON', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockResolvedValueOnce('{ invalid json }');

		await expect(loader.load('/path/to/bad.json')).rejects.toThrow(
			/^\/path\/to\/bad\.json: invalid JSON: /,
		);
	});

	// Node quotes the file around the error, newlines included: one line is enough
	it('says what is wrong with the JSON in one line', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockResolvedValueOnce('{\n  "force": tru\n}\n');

		const error = await loader.load('/path/to/bad.json').catch((err: Error) => err);

		expect((error as Error).message).not.toContain('\n');
		// The newline that ends the file isn't quoted as a space
		expect((error as Error).message).not.toMatch(/\s" is not valid JSON$/);
	});

	it('throws descriptive error on file read failure', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

		await expect(loader.load('/path/to/missing.json')).rejects.toThrow(
			/^\/path\/to\/missing\.json: can't be read: ENOENT/,
		);
	});

	it('includes original error message in read failure', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockRejectedValueOnce(new Error('Permission denied'));

		await expect(loader.load('/path/to/secret.json')).rejects.toThrow(/Permission denied/);
	});

	it('handles empty JSON object', async () => {
		const loader = jsonLoader();
		mockedReadFile.mockResolvedValueOnce('{}');

		const result = await loader.load('/path/to/empty.json');
		expect(result).toEqual({});
	});
});
