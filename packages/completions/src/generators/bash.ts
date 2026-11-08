/**
 * @runa-cmd/completions — Bash completion script generator
 *
 * Generates a self-contained bash completion script from a CLISchema.
 * Uses raw COMP_WORDS/COMP_CWORD — no dependency on bash-completion package.
 */

import type { CLISchema, CommandSchema, OptionSchema } from '@runa-cmd/core';
import { escapeBash } from './escape.js';
import { offersNegation } from './negation.js';

/** Replace non-identifier characters with underscores */
function safeName(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Build --long option names for an option, including --no-* for a boolean that starts on */
function optionFlags(opt: OptionSchema): string[] {
	const flags: string[] = [`--${opt.flag}`];
	if (offersNegation(opt)) {
		flags.push(`--no-${opt.flag}`);
	}
	if (opt.alias) {
		for (const a of opt.alias) {
			flags.push(a);
		}
	}
	return flags;
}

/** Build the list of all option flag strings for a command context */
function buildOptWords(options: OptionSchema[], globalOptions: OptionSchema[]): string {
	const all = [...options, ...globalOptions];
	return all.flatMap(optionFlags).join(' ');
}

/**
 * The lines that offer enum values. compgen splits on IFS, so a value with a
 * space needs newlines as the separator, and %q so it's inserted as one word.
 */
function enumReply(values: string[]): string[] {
	if (!values.some((value) => /\s/.test(value))) {
		const words = values.map((value) => escapeBash(value)).join(' ');
		return [`                COMPREPLY=($(compgen -W '${words}' -- "$cur"))`];
	}

	const words = values.map((value) => escapeBash(value)).join('\n');
	return [
		"                local IFS=$'\\n'",
		`                COMPREPLY=($(compgen -W '${words}' -- "$cur" | while IFS= read -r value; do printf '%q\\n' "$value"; done))`,
	];
}

/** Build prev-matching case entries for enum options */
function buildPrevCases(options: OptionSchema[], globalOptions: OptionSchema[]): string {
	const lines: string[] = [];
	const all = [...options, ...globalOptions];
	for (const opt of all) {
		if (opt.enumValues?.length) {
			const triggers: string[] = [`--${opt.flag}`];
			if (opt.alias) {
				for (const a of opt.alias) {
					triggers.push(a);
				}
			}
			const pattern = triggers.join('|');
			lines.push(`            ${pattern})`);
			lines.push(...enumReply(opt.enumValues));
			lines.push('                return ;;');
		}
	}
	return lines.join('\n');
}

/**
 * Recursively collect all case entries for the command tree.
 * Each command becomes a case pattern based on its path.
 */
function collectCases(
	commands: CommandSchema[],
	globalOptions: OptionSchema[],
	prefix: string,
): string[] {
	const entries: string[] = [];

	for (const cmd of commands) {
		const path = prefix ? `${prefix}_${cmd.name}` : `_${cmd.name}`;
		const optWords = buildOptWords(cmd.options, globalOptions);
		const hasSubcmds = cmd.subcommands && cmd.subcommands.length > 0;
		const subcmdNames = hasSubcmds ? (cmd.subcommands ?? []).map((s) => s.name).join(' ') : '';

		const lines: string[] = [];
		lines.push(`        "${path}")`);

		// prev-matching for enum values in this command's context
		const prevCases = buildPrevCases(cmd.options, globalOptions);
		if (prevCases) {
			lines.push('            case "$prev" in');
			lines.push(prevCases);
			lines.push('            esac');
		}

		if (hasSubcmds) {
			lines.push('            if [[ "$cur" == -* ]]; then');
			lines.push(`                COMPREPLY=($(compgen -W '${optWords}' -- "$cur"))`);
			lines.push('            else');
			lines.push(`                COMPREPLY=($(compgen -W '${subcmdNames}' -- "$cur"))`);
			lines.push('            fi');
		} else {
			lines.push('            if [[ "$cur" == -* ]]; then');
			lines.push(`                COMPREPLY=($(compgen -W '${optWords}' -- "$cur"))`);
			lines.push('            fi');
		}
		lines.push('            ;;');
		entries.push(lines.join('\n'));

		if (hasSubcmds) {
			entries.push(...collectCases(cmd.subcommands ?? [], globalOptions, path));
		}
	}

	return entries;
}

/** Every command path, as the case patterns name them: `_group _group_add-tag`. */
function commandPaths(commands: CommandSchema[], prefix = ''): string[] {
	return commands.flatMap((cmd) => {
		const path = `${prefix}_${cmd.name}`;
		return [path, ...commandPaths(cmd.subcommands ?? [], path)];
	});
}

/** The flags whose next word is their value, not a command: all but booleans. */
function valueFlags(commands: CommandSchema[], globalOptions: OptionSchema[]): string[] {
	const options = [
		...globalOptions,
		...commands.flatMap(function all(cmd): OptionSchema[] {
			return [...cmd.options, ...(cmd.subcommands ?? []).flatMap(all)];
		}),
	];
	const flags = options
		.filter((opt) => opt.type !== 'boolean')
		.flatMap((opt) => [`--${opt.flag}`, ...(opt.alias ?? [])]);
	return [...new Set(flags)];
}

/**
 * Generate a complete bash completion script from a CLISchema.
 *
 * @param schema - Full CLI schema from api.getSchema()
 * @param binName - The CLI binary name
 * @returns Complete bash script as a string
 */
export function generateBashCompletions(schema: CLISchema, binName: string): string {
	const funcName = `_${safeName(binName)}_completions`;
	const { commands, globalOptions } = schema;

	const globalOptWords = globalOptions.flatMap(optionFlags).join(' ');
	const topCmdNames = commands.map((c) => c.name).join(' ');

	// Top-level prev cases for global enum options
	const topPrevCases = buildPrevCases([], globalOptions);

	// Nested command cases
	const cmdCases = collectCases(commands, globalOptions, '');

	// Build the top-level option words (commands' options don't apply here)
	const topOptWords = globalOptWords;

	const lines: string[] = [];
	lines.push('#!/usr/bin/env bash');
	lines.push(`# Bash completions for ${escapeBash(binName)}`);
	lines.push('# Generated by @runa-cmd/completions');
	lines.push('');
	lines.push(`${funcName}() {`);
	// biome-ignore lint/suspicious/noTemplateCurlyInString: these are bash variables, not JS template literals
	lines.push('    local cur="${COMP_WORDS[COMP_CWORD]}"');
	// biome-ignore lint/suspicious/noTemplateCurlyInString: bash variable
	lines.push('    local prev="${COMP_WORDS[COMP_CWORD-1]}"');
	lines.push('');
	// A word joins the path only if it names a command there: a positional, or
	// the value of an option, as in `hello Ana --lang <TAB>`, is not one (T-240).
	// Strings, not arrays, so it runs on the bash 3.2 of macOS.
	lines.push('    # Build the command path from COMP_WORDS, past positionals and values');
	lines.push(`    local paths=" ${commandPaths(commands).join(' ')} "`);
	lines.push(`    local value_flags=" ${valueFlags(commands, globalOptions).join(' ')} "`);
	lines.push('    local cmd_path=""');
	lines.push('    local skip=0');
	lines.push('    local i=1');
	lines.push('    while [[ $i -lt $COMP_CWORD ]]; do');
	// biome-ignore lint/suspicious/noTemplateCurlyInString: bash variable
	lines.push('        local word="${COMP_WORDS[i]}"');
	lines.push('        if [[ $skip -eq 1 ]]; then');
	lines.push('            skip=0');
	lines.push('        elif [[ "$word" == -* ]]; then');
	lines.push('            [[ "$word" != *=* && "$value_flags" == *" $word "* ]] && skip=1');
	// biome-ignore lint/suspicious/noTemplateCurlyInString: bash variable
	lines.push('        elif [[ "$paths" == *" ${cmd_path}_${word} "* ]]; then');
	// biome-ignore lint/suspicious/noTemplateCurlyInString: bash variable
	lines.push('            cmd_path="${cmd_path}_${word}"');
	lines.push('        fi');
	lines.push('        ((i++))');
	lines.push('    done');
	lines.push('');
	lines.push('    case "$cmd_path" in');
	lines.push('        "")');

	// Top-level prev cases
	if (topPrevCases) {
		lines.push('            case "$prev" in');
		lines.push(topPrevCases);
		lines.push('            esac');
	}

	lines.push('            if [[ "$cur" == -* ]]; then');
	lines.push(`                COMPREPLY=($(compgen -W '${topOptWords}' -- "$cur"))`);
	lines.push('            else');
	lines.push(`                COMPREPLY=($(compgen -W '${topCmdNames}' -- "$cur"))`);
	lines.push('            fi');
	lines.push('            ;;');

	for (const entry of cmdCases) {
		lines.push(entry);
	}

	lines.push('    esac');
	lines.push('}');
	lines.push(`complete -F ${funcName} ${binName}`);

	return lines.join('\n');
}
