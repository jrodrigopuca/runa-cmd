/**
 * Unit tests for introspect.ts — getSchema() API
 *
 * Tests: CLI schema extraction, nested commands, option metadata, hasOutput
 * References: Spec Section 11 — introspection scenarios
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { getSchema } from '../introspect.js'
import { defineCommand } from '../command.js'
import type { CLIConfig, OptionMeta } from '../types.js'

// ─── Helpers ────────────────────────────────────────────────

function makeSimpleCLI(): CLIConfig {
  const greet = defineCommand({
    meta: { name: 'greet', description: 'Greet someone' },
    args: { name: z.string().describe('Name to greet') },
    options: {
      loud: z.boolean().default(false).describe('Shout the greeting'),
    },
    run: () => {},
  })

  const deploy = defineCommand({
    meta: {
      name: 'deploy',
      description: 'Deploy the app',
      options: {
        env: { alias: ['-e', '--environment'], env: 'DEPLOY_ENV', hint: 'staging|prod' },
        replicas: { group: 'Scaling' },
      },
    },
    options: {
      env: z.enum(['staging', 'prod']).describe('Target environment'),
      replicas: z.number().default(3).describe('Number of replicas'),
    },
    run: () => {},
  })

  return {
    meta: { name: 'mycli', version: '1.0.0', description: 'My CLI tool' },
    commands: { greet, deploy },
  }
}

// ─── Tests ──────────────────────────────────────────────────

describe('getSchema', () => {
  it('extracts schema from a simple CLI with two commands', () => {
    const config = makeSimpleCLI()
    const schema = getSchema(config)

    expect(schema.meta.name).toBe('mycli')
    expect(schema.meta.version).toBe('1.0.0')
    expect(schema.commands).toHaveLength(2)

    const names = schema.commands.map((c) => c.name)
    expect(names).toContain('greet')
    expect(names).toContain('deploy')
  })

  it('extracts arg schemas from commands', () => {
    const config = makeSimpleCLI()
    const schema = getSchema(config)

    const greet = schema.commands.find((c) => c.name === 'greet')!
    expect(greet.args).toHaveLength(1)
    expect(greet.args[0]!.name).toBe('name')
    expect(greet.args[0]!.type).toBe('string')
    expect(greet.args[0]!.required).toBe(true)
    expect(greet.args[0]!.description).toBe('Name to greet')
  })

  it('extracts option schemas from commands', () => {
    const config = makeSimpleCLI()
    const schema = getSchema(config)

    const greet = schema.commands.find((c) => c.name === 'greet')!
    expect(greet.options).toHaveLength(1)
    expect(greet.options[0]!.name).toBe('loud')
    expect(greet.options[0]!.type).toBe('boolean')
    expect(greet.options[0]!.required).toBe(false)
    expect(greet.options[0]!.defaultValue).toBe(false)
  })

  it('includes option metadata (alias, env, hint, group)', () => {
    const config = makeSimpleCLI()
    const schema = getSchema(config)

    const deploy = schema.commands.find((c) => c.name === 'deploy')!
    const envOpt = deploy.options.find((o) => o.name === 'env')!

    expect(envOpt.alias).toEqual(['-e', '--environment'])
    expect(envOpt.env).toBe('DEPLOY_ENV')
    expect(envOpt.hint).toBe('staging|prod')
    expect(envOpt.type).toBe('enum')
    expect(envOpt.enumValues).toEqual(['staging', 'prod'])

    const replicasOpt = deploy.options.find((o) => o.name === 'replicas')!
    expect(replicasOpt.group).toBe('Scaling')
    expect(replicasOpt.type).toBe('number')
    expect(replicasOpt.defaultValue).toBe(3)
  })

  it('detects hasOutput correctly', () => {
    const withOutput = defineCommand({
      meta: { name: 'with-output', description: 'Has output' },
      output: z.object({ url: z.string() }),
      run: () => ({ url: 'https://example.com' }),
    })

    const withoutOutput = defineCommand({
      meta: { name: 'no-output', description: 'No output' },
      run: () => {},
    })

    const config: CLIConfig = {
      meta: { name: 'test' },
      commands: { 'with-output': withOutput, 'no-output': withoutOutput },
    }

    const schema = getSchema(config)
    const hasOutputCmd = schema.commands.find((c) => c.name === 'with-output')!
    const noOutputCmd = schema.commands.find((c) => c.name === 'no-output')!

    expect(hasOutputCmd.hasOutput).toBe(true)
    expect(noOutputCmd.hasOutput).toBe(false)
  })

  it('handles nested subcommands with correct fullPath', () => {
    const setCmd = defineCommand({
      meta: { name: 'set', description: 'Set a config value' },
      args: { key: z.string(), value: z.string() },
      run: () => {},
    })

    const getCmd = defineCommand({
      meta: { name: 'get', description: 'Get a config value' },
      args: { key: z.string() },
      run: () => {},
    })

    const config: CLIConfig = {
      meta: { name: 'mycli' },
      commands: {
        config: {
          set: setCmd,
          get: getCmd,
        },
      },
    }

    const schema = getSchema(config)

    // Top-level should have one entry: 'config' (a group, not a command)
    expect(schema.commands).toHaveLength(1)
    const configGroup = schema.commands[0]!
    expect(configGroup.name).toBe('config')
    expect(configGroup.fullPath).toEqual(['config'])
    expect(configGroup.subcommands).toHaveLength(2)

    const setSchema = configGroup.subcommands!.find((c) => c.name === 'set')!
    expect(setSchema.fullPath).toEqual(['config', 'set'])
    expect(setSchema.args).toHaveLength(2)

    const getSchema_ = configGroup.subcommands!.find((c) => c.name === 'get')!
    expect(getSchema_.fullPath).toEqual(['config', 'get'])
    expect(getSchema_.args).toHaveLength(1)
  })

  it('handles global options', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test' },
      run: () => {},
    })

    const config: CLIConfig = {
      meta: { name: 'mycli' },
      commands: { test: cmd },
      globalOptions: {
        verbose: z.boolean().default(false).describe('Verbose output'),
        logLevel: z.enum(['debug', 'info', 'warn', 'error']).describe('Log level'),
      },
      globalMeta: {
        options: {
          verbose: { alias: ['-v'] },
          logLevel: { env: 'LOG_LEVEL' },
        },
      },
    }

    const schema = getSchema(config)

    expect(schema.globalOptions).toHaveLength(2)

    const verbose = schema.globalOptions.find((o) => o.name === 'verbose')!
    expect(verbose.type).toBe('boolean')
    expect(verbose.alias).toEqual(['-v'])

    const logLevel = schema.globalOptions.find((o) => o.name === 'logLevel')!
    expect(logLevel.type).toBe('enum')
    expect(logLevel.env).toBe('LOG_LEVEL')
  })

  it('merges extra global options and meta', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test' },
      run: () => {},
    })

    const config: CLIConfig = {
      meta: { name: 'mycli' },
      commands: { test: cmd },
      globalOptions: {
        verbose: z.boolean().default(false),
      },
    }

    const extraOptions: Record<string, import('zod').ZodType> = {
      debug: z.boolean().default(false),
    }
    const extraMeta: Record<string, OptionMeta> = {
      debug: { alias: ['-d'] },
    }

    const schema = getSchema(config, extraOptions, extraMeta)

    expect(schema.globalOptions).toHaveLength(2)
    const debug = schema.globalOptions.find((o) => o.name === 'debug')!
    expect(debug.alias).toEqual(['-d'])
  })

  it('handles variadic args in schema', () => {
    const cmd = defineCommand({
      meta: { name: 'copy', description: 'Copy files' },
      args: {
        dest: z.string().describe('Destination'),
        files: z.array(z.string()).describe('Files to copy'),
      },
      run: () => {},
    })

    const config: CLIConfig = {
      meta: { name: 'mycli' },
      commands: { copy: cmd },
    }

    const schema = getSchema(config)
    const copy = schema.commands.find((c) => c.name === 'copy')!
    expect(copy.args).toHaveLength(2)

    const dest = copy.args.find((a) => a.name === 'dest')!
    expect(dest.isVariadic).toBe(false)

    const files = copy.args.find((a) => a.name === 'files')!
    expect(files.isVariadic).toBe(true)
  })

  it('handles CLI with no global options', () => {
    const cmd = defineCommand({
      meta: { name: 'test', description: 'Test' },
      run: () => {},
    })

    const config: CLIConfig = {
      meta: { name: 'mycli' },
      commands: { test: cmd },
    }

    const schema = getSchema(config)
    expect(schema.globalOptions).toEqual([])
  })
})
