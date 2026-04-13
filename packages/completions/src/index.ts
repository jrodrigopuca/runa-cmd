/**
 * @runa-cmd/completions — Public API
 *
 * Barrel re-exports for the completions plugin package.
 */

// Generators (for advanced use / direct invocation)
export { generateBashCompletions } from './generators/bash.js';
export { generateFishCompletions } from './generators/fish.js';
export { generateZshCompletions } from './generators/zsh.js';
// Install instructions
export { getInstallInstructions } from './install.js';
// Plugin
export { completionsPlugin } from './plugin.js';
// Types
export type { CompletionsPluginOptions, Shell } from './types.js';
