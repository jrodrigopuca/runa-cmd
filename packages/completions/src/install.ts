/**
 * @runa-cmd/completions — Install instructions
 *
 * Returns shell-specific installation instructions for the
 * generated completion scripts.
 */

import type { Shell } from './types.js';

/**
 * Get shell-specific installation instructions for the completion script.
 *
 * @param shell - Target shell
 * @param binName - CLI binary name
 * @returns Multi-line instruction string
 */
export function getInstallInstructions(shell: Shell, binName: string): string {
	switch (shell) {
		case 'bash':
			return getBashInstructions(binName);
		case 'zsh':
			return getZshInstructions(binName);
		case 'fish':
			return getFishInstructions(binName);
	}
}

function getBashInstructions(binName: string): string {
	return `# Bash completions for ${binName}
#
# Option 1: Add to your .bashrc (loads on every shell start)
#
#   echo 'eval "$(${binName} completions bash)"' >> ~/.bashrc
#
# Option 2: Save to bash-completion directory (recommended)
#
#   ${binName} completions bash > ~/.local/share/bash-completion/completions/${binName}
#
# Then restart your shell or run:
#
#   source ~/.bashrc
`;
}

function getZshInstructions(binName: string): string {
	return `# Zsh completions for ${binName}
#
# Option 1: Save to a completions directory in your fpath
#
#   mkdir -p ~/.zsh/completions
#   ${binName} completions zsh > ~/.zsh/completions/_${binName}
#
#   Then add to your .zshrc (before compinit):
#
#     fpath=(~/.zsh/completions $fpath)
#     autoload -Uz compinit && compinit
#
# Option 2: Add to your .zshrc directly
#
#   echo 'eval "$(${binName} completions zsh)"' >> ~/.zshrc
#
# Then restart your shell or run:
#
#   source ~/.zshrc
`;
}

function getFishInstructions(binName: string): string {
	return `# Fish completions for ${binName}
#
# Save to fish completions directory (auto-loaded by convention):
#
#   ${binName} completions fish > ~/.config/fish/completions/${binName}.fish
#
# Fish automatically loads completions from this directory.
# No additional configuration needed.
`;
}
