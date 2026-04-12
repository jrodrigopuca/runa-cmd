/**
 * @runa-cmd/core — Error class hierarchy
 *
 * RunaError (base) → ValidationError | CommandNotFoundError | CommandError
 * POSIX-aligned exit codes: 2 (usage), 127 (not found), 1 (general).
 */
import type { ZodIssue } from 'zod'

// V8-specific: captureStackTrace is not in the standard Error type
const captureStackTrace = (Error as { captureStackTrace?: (target: object, ctor: Function) => void }).captureStackTrace

// ─── RunaError ──────────────────────────────────────────────

export class RunaError extends Error {
  readonly code: string
  readonly exitCode: number

  constructor(message: string, options: { code: string; exitCode?: number }) {
    super(message)
    this.name = 'RunaError'
    this.code = options.code
    this.exitCode = options.exitCode ?? 1

    if (captureStackTrace) {
      captureStackTrace(this, this.constructor)
    }
  }
}

// ─── ValidationError ────────────────────────────────────────

export class ValidationError extends RunaError {
  readonly issues: ZodIssue[]

  constructor(issues: ZodIssue[]) {
    const message = issues
      .map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
        return `${path}${issue.message}`
      })
      .join('\n')

    super(message, { code: 'VALIDATION_ERROR', exitCode: 2 })
    this.name = 'ValidationError'
    this.issues = issues

    if (captureStackTrace) {
      captureStackTrace(this, this.constructor)
    }
  }
}

// ─── CommandNotFoundError ───────────────────────────────────

export class CommandNotFoundError extends RunaError {
  readonly suggestion?: string

  constructor(commandName: string, suggestion?: string) {
    const message = suggestion
      ? `Command not found: '${commandName}'. Did you mean '${suggestion}'?`
      : `Command not found: '${commandName}'.`

    super(message, { code: 'COMMAND_NOT_FOUND', exitCode: 127 })
    this.name = 'CommandNotFoundError'
    this.suggestion = suggestion

    if (captureStackTrace) {
      captureStackTrace(this, this.constructor)
    }
  }
}

// ─── CommandError ───────────────────────────────────────────

export class CommandError extends RunaError {
  constructor(message: string, options?: { code?: string; exitCode?: number }) {
    super(message, {
      code: options?.code ?? 'COMMAND_ERROR',
      exitCode: options?.exitCode ?? 1,
    })
    this.name = 'CommandError'

    if (captureStackTrace) {
      captureStackTrace(this, this.constructor)
    }
  }
}
