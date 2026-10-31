/**
 * @runa-cmd/core/internal — Shared with other @runa-cmd packages only.
 * Not public API: it can change in any release.
 */
export { killProcessTree, STOP_DEADLINE_MS } from './stop.js';
export type { ToolReport, ToolRequest } from './tool-channel.js';
export { TOOL_CALL_ENV, TOOL_INPUT_FD, TOOL_REPORT_FD } from './tool-channel.js';
