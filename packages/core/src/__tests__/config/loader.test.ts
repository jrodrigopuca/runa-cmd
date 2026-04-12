/**
 * Unit tests for config/loader.ts — JSON config loader
 *
 * Tests: jsonLoader reads/parses JSON, error handling
 * References: Spec Section 8 — config loading scenarios
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jsonLoader } from '../../config/loader.js'

// We need to mock node:fs/promises for controlled tests
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

// Import the mocked module
const { readFile } = await import('node:fs/promises')
const mockedReadFile = vi.mocked(readFile)

describe('jsonLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a ConfigLoader with .json extension', () => {
    const loader = jsonLoader()
    expect(loader.extensions).toEqual(['.json'])
  })

  it('loads and parses valid JSON', async () => {
    const loader = jsonLoader()
    mockedReadFile.mockResolvedValueOnce('{"env":"staging","replicas":3}')

    const result = await loader.load('/path/to/config.json')

    expect(mockedReadFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8')
    expect(result).toEqual({ env: 'staging', replicas: 3 })
  })

  it('loads JSON with nested objects', async () => {
    const loader = jsonLoader()
    mockedReadFile.mockResolvedValueOnce('{"deploy":{"target":"prod","replicas":5}}')

    const result = await loader.load('/path/to/config.json')

    expect(result).toEqual({ deploy: { target: 'prod', replicas: 5 } })
  })

  it('throws descriptive error on invalid JSON', async () => {
    const loader = jsonLoader()
    mockedReadFile.mockResolvedValueOnce('{ invalid json }')

    await expect(loader.load('/path/to/bad.json')).rejects.toThrow(
      /Invalid JSON in config file '\/path\/to\/bad\.json'/,
    )
  })

  it('throws descriptive error on file read failure', async () => {
    const loader = jsonLoader()
    mockedReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'))

    await expect(loader.load('/path/to/missing.json')).rejects.toThrow(
      /Failed to read config file '\/path\/to\/missing\.json'/,
    )
  })

  it('includes original error message in read failure', async () => {
    const loader = jsonLoader()
    mockedReadFile.mockRejectedValueOnce(new Error('Permission denied'))

    await expect(loader.load('/path/to/secret.json')).rejects.toThrow(
      /Permission denied/,
    )
  })

  it('handles empty JSON object', async () => {
    const loader = jsonLoader()
    mockedReadFile.mockResolvedValueOnce('{}')

    const result = await loader.load('/path/to/empty.json')
    expect(result).toEqual({})
  })
})
