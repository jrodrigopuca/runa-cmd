/**
 * @runa-cmd/help — Public API
 *
 * Barrel re-exports for the Runa help system.
 * Layout primitives are independent and usable standalone.
 */

// ─── ANSI utilities ─────────────────────────────────────────
export { bold, dim, fg, italic, reset, strip, underline, visibleWidth } from './ansi/codes.js';
export {
	detectColorDepth,
	detectTermWidth,
	getRenderContext,
	resetRenderContext,
} from './ansi/detect.js';
export { downsampleColor } from './ansi/downsample.js';
// ─── Plugin ─────────────────────────────────────────────────
export { helpPlugin } from './plugin.js';
export type { BorderStyle, BoxOptions } from './primitives/box.js';
// ─── Layout Primitives ──────────────────────────────────────
export { box } from './primitives/box.js';
export type { ColumnsOptions } from './primitives/columns.js';
export { columns } from './primitives/columns.js';
export type {
	HorizontalAlign,
	HorizontalJoinOptions,
	VerticalJoinOptions,
} from './primitives/join.js';
export { join } from './primitives/join.js';
export type { ListOptions } from './primitives/list.js';
export { list } from './primitives/list.js';
export type { StyledOptions } from './primitives/styled.js';
export { styled } from './primitives/styled.js';
export type { TableOptions } from './primitives/table.js';
export { table } from './primitives/table.js';

// ─── Theme + Renderer ───────────────────────────────────────
export { defaultRenderer } from './render.js';
export { defaultTheme, resolveTheme } from './theme.js';

// ─── Types ──────────────────────────────────────────────────
export type {
	Block,
	ColorDepth,
	HelpPluginOptions,
	RenderContext,
	RenderFnCtx,
	ResolvedTheme,
	Theme,
} from './types.js';
