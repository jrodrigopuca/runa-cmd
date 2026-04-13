import { describe, expect, it } from 'vitest';
import { getInstallInstructions } from '../install.js';

describe('getInstallInstructions', () => {
	describe('bash', () => {
		it('includes eval command for .bashrc', () => {
			const result = getInstallInstructions('bash', 'my-tool');
			expect(result).toContain('eval "$(my-tool completions bash)"');
		});

		it('includes bash-completion directory path', () => {
			const result = getInstallInstructions('bash', 'my-tool');
			expect(result).toContain('~/.local/share/bash-completion/completions/my-tool');
		});

		it('includes the binary name in the completion command', () => {
			const result = getInstallInstructions('bash', 'custom-cli');
			expect(result).toContain('custom-cli completions bash');
		});
	});

	describe('zsh', () => {
		it('includes zsh completions directory path with _ prefix', () => {
			const result = getInstallInstructions('zsh', 'my-tool');
			expect(result).toContain('~/.zsh/completions/_my-tool');
		});

		it('includes fpath and compinit instructions', () => {
			const result = getInstallInstructions('zsh', 'my-tool');
			expect(result).toContain('fpath=');
			expect(result).toContain('compinit');
		});

		it('includes the binary name in the completion command', () => {
			const result = getInstallInstructions('zsh', 'custom-cli');
			expect(result).toContain('custom-cli completions zsh');
		});
	});

	describe('fish', () => {
		it('includes fish completions directory with .fish extension', () => {
			const result = getInstallInstructions('fish', 'my-tool');
			expect(result).toContain('~/.config/fish/completions/my-tool.fish');
		});

		it('mentions auto-loading', () => {
			const result = getInstallInstructions('fish', 'my-tool');
			expect(result).toContain('automatically loads');
		});

		it('includes the binary name in the completion command', () => {
			const result = getInstallInstructions('fish', 'custom-cli');
			expect(result).toContain('custom-cli completions fish');
		});
	});
});
