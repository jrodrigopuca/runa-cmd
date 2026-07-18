/**
 * @runa-cmd/help — Type definitions
 *
 * All TypeScript types for the help system.
 * Schema types (CLISchema, CommandSchema, etc.) are imported from @runa-cmd/core.
 * This is a type-only module — no runtime code.
 */
import type { CLISchema, CommandSchema } from '@runa-cmd/core';

// ─── Core Rendering Unit ────────────────────────────────────

/** Everything returns a Block — just a string with optional ANSI codes */
export type Block = string;

// ─── Terminal Detection ─────────────────────────────────────

/** Detected color depth of the terminal */
export type ColorDepth = 'truecolor' | '256' | '16' | 'none';

/** Render context passed to all primitives (auto-detected or overridden in tests) */
export interface RenderContext {
	colorDepth: ColorDepth;
	termWidth: number;
}

// ─── Theme ──────────────────────────────────────────────────

/** Theme colors — all values are hex (#RRGGBB) or named ANSI attribute (e.g. 'dim') */
export interface Theme {
	/** Titles, borders */
	primary: string;
	/** Required markers, highlights */
	secondary: string;
	/** Descriptions, defaults */
	muted: string;
	/** Error messages */
	error: string;
	/** Warnings */
	warning: string;
	/** Success states */
	success: string;
}

/** Theme with all colors resolved to ANSI-ready escape strings */
export interface ResolvedTheme {
	primary: string;
	secondary: string;
	muted: string;
	error: string;
	warning: string;
	success: string;
}

// ─── Render Function Context ────────────────────────────────

/** What the custom render function receives (Layer 3) */
export interface RenderFnCtx {
	/** The target schema (root CLI or specific subcommand) */
	schema: CLISchema | CommandSchema;
	/** Resolved theme with ANSI-ready colors */
	theme: ResolvedTheme;
	/** Detected color depth */
	colorDepth: ColorDepth;
	/** Terminal width in columns */
	termWidth: number;
}

// ─── Plugin Options ─────────────────────────────────────────

/** Options for helpPlugin() */
export interface HelpPluginOptions {
	/** Partial theme override (merged with defaultTheme) */
	theme?: Partial<Theme>;
	/** Custom render function (Layer 3 — full control) */
	render?: (ctx: RenderFnCtx) => string;
	/**
	 * Call process.exit(0) after rendering help. Default: false —
	 * the lifecycle short-circuits instead, so cleanup hooks run and
	 * cli.run() resolves (required for embedding/testing). Set to true
	 * to restore the v0.1.0 hard-exit behavior.
	 */
	exitOnHelp?: boolean;
}
