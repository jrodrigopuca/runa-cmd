/**
 * Integration tests for defineCLI() + full lifecycle
 *
 * Tests the end-to-end CLI: command resolution, subcommands, plugins,
 * middleware, hooks, config loading, error handling.
 *
 * References: Spec Section 1, 4, 5, 6, 8, 9 integration scenarios
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { defineCLI, runCLI } from '../../cli.js'
import { defineCommand } from '../../command.js'
import { defineMiddleware } from '../../middleware.js'
import { definePlugin } from '../../plugin.js'
import {
  RunaError,
  CommandNotFoundError,
  ValidationError,
} from '../../errors.js'
import type { CLIConfig, PluginConfig } from '../../types.js'

// ─── Helpers ────────────────────────────────────────────────

/** Capture process.exit and console.error calls */
function mockProcessExit() {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  return { exitSpy, errorSpy }
}

function restoreMocks(spies: ReturnType<typeof mockProcessExit>) {
  spies.exitSpy.mockRestore()
  spies.errorSpy.mockRestore()
}

// ─── Tests ──────────────────────────────────────────────────

describe('defineCLI + lifecycle integration', () => {
  let spies: ReturnType<typeof mockProcessExit>

  beforeEach(() => {
    spies = mockProcessExit()
  })

  afterEach(() => {
    restoreMocks(spies)
  })

  describe('command resolution', () => {
    it('resolves correct subcommand from multi-command CLI', async () => {
      const log: string[] = []

      const greet = defineCommand({
        meta: { name: 'greet', description: 'Greet' },
        args: { name: z.string() },
        run: (ctx) => { log.push(`greet:${ctx.args.name}`) },
      })

      const deploy = defineCommand({
        meta: { name: 'deploy', description: 'Deploy' },
        args: { target: z.string() },
        run: (ctx) => { log.push(`deploy:${ctx.args.target}`) },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { greet, deploy },
      })

      await cli.run(['greet', 'World'])
      expect(log).toEqual(['greet:World'])
    })

    it('resolves nested subcommands (2-level)', async () => {
      const log: string[] = []

      const setCmd = defineCommand({
        meta: { name: 'set', description: 'Set config' },
        args: { key: z.string(), value: z.string() },
        run: (ctx) => { log.push(`set:${ctx.args.key}=${ctx.args.value}`) },
      })

      const getCmd = defineCommand({
        meta: { name: 'get', description: 'Get config' },
        args: { key: z.string() },
        run: (ctx) => { log.push(`get:${ctx.args.key}`) },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: {
          config: { set: setCmd, get: getCmd },
        },
      })

      await cli.run(['config', 'set', 'name', 'Juan'])
      expect(log).toEqual(['set:name=Juan'])
    })

    it('unknown command triggers process.exit with 127', async () => {
      const cmd1 = defineCommand({
        meta: { name: 'deploy', description: 'Deploy' },
        run: () => {},
      })
      const cmd2 = defineCommand({
        meta: { name: 'build', description: 'Build' },
        run: () => {},
      })

      // Need multiple commands to avoid single-command mode
      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { deploy: cmd1, build: cmd2 },
      })

      await cli.run(['unknown'])

      expect(spies.exitSpy).toHaveBeenCalledWith(127)
    })
  })

  describe('single-command mode (runCLI)', () => {
    it('routes directly without command name', async () => {
      const log: string[] = []

      const cmd = defineCommand({
        meta: { name: 'build', description: 'Build' },
        args: { target: z.string() },
        run: (ctx) => { log.push(`build:${ctx.args.target}`) },
      })

      const cli = defineCLI({
        meta: { name: 'build', description: 'Build' },
        commands: { build: cmd },
      })

      // In single-command mode, argv doesn't need the command name
      await cli.run(['production'])
      expect(log).toEqual(['build:production'])
    })
  })

  describe('middleware chain', () => {
    it('executes middleware in onion order', async () => {
      const log: string[] = []

      const timing = defineMiddleware(async (ctx) => {
        log.push('timing:before')
        await ctx.next()
        log.push('timing:after')
      })

      const auth = defineMiddleware(async (ctx) => {
        log.push('auth:before')
        await ctx.next()
        log.push('auth:after')
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { log.push('command:run') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        middleware: [timing, auth],
      })

      await cli.run(['test'])

      expect(log).toEqual([
        'timing:before',
        'auth:before',
        'command:run',
        'auth:after',
        'timing:after',
      ])
    })

    it('middleware can short-circuit by not calling next()', async () => {
      const log: string[] = []

      const blocker = defineMiddleware(async (_ctx) => {
        log.push('blocker:denied')
        // Deliberately NOT calling ctx.next()
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { log.push('command:run') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        middleware: [blocker],
      })

      await cli.run(['test'])

      expect(log).toEqual(['blocker:denied'])
      expect(log).not.toContain('command:run')
    })
  })

  describe('lifecycle hooks', () => {
    it('hooks fire in correct order on success', async () => {
      const log: string[] = []

      const hookPlugin = definePlugin({
        meta: { name: 'hook-logger', version: '1.0.0' },
        setup: (api) => {
          api.hook('beforeParse', () => { log.push('beforeParse') })
          api.hook('onGlobalFlags', () => { log.push('onGlobalFlags') })
          api.hook('afterParse', () => { log.push('afterParse') })
          api.hook('beforeRun', () => { log.push('beforeRun') })
          api.hook('afterRun', () => { log.push('afterRun') })
          api.hook('cleanup', () => { log.push('cleanup') })
        },
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { log.push('command:run') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        plugins: [hookPlugin],
      })

      await cli.run(['test'])

      expect(log).toEqual([
        'beforeParse',
        'onGlobalFlags',
        'afterParse',
        'beforeRun',
        'command:run',
        'afterRun',
        'cleanup',
      ])
    })

    it('onGlobalFlags can short-circuit, skipping command execution', async () => {
      const log: string[] = []

      const versionPlugin = definePlugin({
        meta: { name: 'version', version: '1.0.0' },
        capabilities: { addGlobalOptions: true },
        setup: (api) => {
          api.addGlobalOption('version', z.boolean().default(false))
          api.hook('onGlobalFlags', (ctx) => {
            if (ctx.globalOptions?.version) {
              log.push('version:1.0.0')
              ctx.shortCircuit!()
            }
          })
          api.hook('cleanup', () => { log.push('cleanup') })
        },
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { log.push('command:run') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        plugins: [versionPlugin],
      })

      await cli.run(['--version'])

      expect(log).toContain('version:1.0.0')
      expect(log).not.toContain('command:run')
      expect(log).toContain('cleanup')
    })
  })

  describe('plugin lifecycle', () => {
    it('plugins set up in dependency order, cleanup in reverse', async () => {
      const log: string[] = []

      const core = definePlugin({
        meta: { name: 'core', version: '1.0.0' },
        setup: () => { log.push('setup:core') },
        cleanup: () => { log.push('cleanup:core') },
      })

      const auth = definePlugin({
        meta: { name: 'auth', version: '1.0.0', dependencies: ['core'] },
        setup: () => { log.push('setup:auth') },
        cleanup: () => { log.push('cleanup:auth') },
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => {},
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        plugins: [auth, core], // Deliberately out of order
      })

      await cli.run(['test'])

      // Setup in dependency order
      expect(log.indexOf('setup:core')).toBeLessThan(log.indexOf('setup:auth'))
      // Cleanup in reverse
      expect(log.indexOf('cleanup:auth')).toBeLessThan(log.indexOf('cleanup:core'))
    })

    it('plugin can add commands', async () => {
      const log: string[] = []

      const helpCmd = defineCommand({
        meta: { name: 'help', description: 'Show help' },
        run: () => { log.push('help:run') },
      })

      const helpPlugin = definePlugin({
        meta: { name: 'help', version: '1.0.0' },
        capabilities: { addCommands: true },
        setup: (api) => {
          api.addCommand('help', helpCmd)
        },
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { log.push('test:run') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        plugins: [helpPlugin],
      })

      await cli.run(['help'])
      expect(log).toEqual(['help:run'])
    })
  })

  describe('error handling', () => {
    it('onError hook fires on error, cleanup always runs', async () => {
      const log: string[] = []

      const errorPlugin = definePlugin({
        meta: { name: 'error-handler', version: '1.0.0' },
        setup: (api) => {
          api.hook('onError', (ctx) => {
            log.push(`onError:${ctx.error?.message}`)
            ctx.handled = true
          })
          api.hook('cleanup', () => { log.push('cleanup') })
        },
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { throw new RunaError('boom', { code: 'TEST_ERROR' }) },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        plugins: [errorPlugin],
      })

      await cli.run(['test'])

      expect(log).toContain('onError:boom')
      expect(log).toContain('cleanup')
      // Should NOT have called process.exit since error was handled
      expect(spies.exitSpy).not.toHaveBeenCalled()
    })

    it('unhandled error calls process.exit with correct code', async () => {
      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { throw new RunaError('fatal', { code: 'FATAL', exitCode: 42 }) },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
      })

      await cli.run(['test'])

      expect(spies.exitSpy).toHaveBeenCalledWith(42)
      expect(spies.errorSpy).toHaveBeenCalledWith('fatal')
    })

    it('non-RunaError uses exit code 1', async () => {
      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { throw new Error('plain error') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
      })

      await cli.run(['test'])

      expect(spies.exitSpy).toHaveBeenCalledWith(1)
    })

    it('cleanup runs even if onError throws', async () => {
      const log: string[] = []

      const brokenPlugin = definePlugin({
        meta: { name: 'broken', version: '1.0.0' },
        setup: (api) => {
          api.hook('onError', () => {
            throw new Error('onError also broke')
          })
          api.hook('cleanup', () => { log.push('cleanup:ran') })
        },
      })

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        run: () => { throw new Error('command error') },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        plugins: [brokenPlugin],
      })

      await cli.run(['test'])

      expect(log).toContain('cleanup:ran')
    })
  })

  describe('global options', () => {
    it('parses global options before command options', async () => {
      const log: string[] = []

      const cmd = defineCommand({
        meta: { name: 'test', description: 'Test' },
        args: { name: z.string() },
        run: (ctx) => { log.push(`run:${ctx.args.name}`) },
      })

      const cli = defineCLI({
        meta: { name: 'mycli' },
        commands: { test: cmd },
        globalOptions: {
          verbose: z.boolean().default(false),
        },
      })

      await cli.run(['--verbose', 'test', 'hello'])

      expect(log).toEqual(['run:hello'])
    })
  })
})
