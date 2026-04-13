/**
 * @runa-cmd/completions — Type definitions
 *
 * Plugin options and shell type for completionsPlugin().
 */

/** Supported shells for completion generation */
export type Shell = 'bash' | 'zsh' | 'fish';

/** Options for completionsPlugin() */
export interface CompletionsPluginOptions {
	/** Override the command name (default: 'completions') */
	commandName?: string;
}
