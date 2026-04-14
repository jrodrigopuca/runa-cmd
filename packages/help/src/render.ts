/**
 * @runa-cmd/help — Default help renderer
 *
 * Renders beautiful CLI help output from schema introspection data.
 * Sections rendered (skipped if empty):
 * 1. Header — name + version + description
 * 2. Usage — usage string
 * 3. Arguments — positional args table
 * 4. Options — options table (grouped if groups exist)
 * 5. Commands — subcommands table
 */
import type { ArgSchema, CLISchema, CommandSchema, OptionSchema } from '@runa-cmd/core';
import { bold as ansiBold, fg } from './ansi/codes.js';
import { join } from './primitives/join.js';
import { styled } from './primitives/styled.js';
import { table } from './primitives/table.js';
import type { Block, RenderContext, RenderFnCtx, ResolvedTheme } from './types.js';

/**
 * Default help renderer — produces formatted help output.
 *
 * Accepts a RenderFnCtx (same shape as the custom render function receives).
 */
export function defaultRenderer(ctx: RenderFnCtx): string {
	const { schema, theme } = ctx;
	const renderCtx: RenderContext = { colorDepth: ctx.colorDepth, termWidth: ctx.termWidth };

	const sections: Block[] = [];

	// Determine if this is a CLISchema (root) or CommandSchema (subcommand)
	const isCLI = 'meta' in schema && 'commands' in schema && 'globalOptions' in schema;

	if (isCLI) {
		const cli = schema as CLISchema;
		sections.push(...renderCLI(cli, theme, renderCtx));
	} else {
		const cmd = schema as CommandSchema;
		sections.push(...renderCommand(cmd, theme, renderCtx));
	}

	return join.vertical(sections, { gap: 1 });
}

// ─── CLI Root Rendering ─────────────────────────────────────

function renderCLI(cli: CLISchema, theme: ResolvedTheme, ctx: RenderContext): Block[] {
	const sections: Block[] = [];

	// Header
	const name = cli.meta.name;
	const version = cli.meta.version ? ` v${cli.meta.version}` : '';
	sections.push(styled(`${name}${version}`, { bold: true }, ctx));

	if (cli.meta.description) {
		sections.push(styled(cli.meta.description, { dim: true }, ctx));
	}

	// Usage
	const hasCommands = cli.commands.length > 0;
	const usageParts = [name];
	if (hasCommands) usageParts.push('<command>');
	usageParts.push('[options]');
	sections.push(
		join.vertical([
			sectionTitle('USAGE', theme, ctx),
			styled(`  ${usageParts.join(' ')}`, {}, ctx),
		]),
	);

	// Commands
	if (hasCommands) {
		const cmdRows = cli.commands.map((cmd) => [
			styled(cmd.name, { color: 'yellow' }, ctx),
			cmd.description || '',
		]);
		sections.push(join.vertical([sectionTitle('COMMANDS', theme, ctx), indent(table(cmdRows))]));
	}

	// Global Options
	if (cli.globalOptions.length > 0) {
		sections.push(
			join.vertical([
				sectionTitle('GLOBAL OPTIONS', theme, ctx),
				indent(renderOptionsTable(cli.globalOptions, theme, ctx)),
			]),
		);
	}

	return sections;
}

// ─── Command Rendering ──────────────────────────────────────

function renderCommand(cmd: CommandSchema, theme: ResolvedTheme, ctx: RenderContext): Block[] {
	const sections: Block[] = [];

	// Header
	const cmdPath = cmd.fullPath.join(' ');
	sections.push(styled(cmdPath, { bold: true }, ctx));

	if (cmd.description) {
		sections.push(styled(cmd.description, { dim: true }, ctx));
	}

	// Usage
	const usageParts = [cmdPath];
	if (cmd.subcommands && cmd.subcommands.length > 0) usageParts.push('<command>');
	if (cmd.args.length > 0) {
		for (const arg of cmd.args) {
			usageParts.push(arg.required ? `<${arg.name}>` : `[${arg.name}]`);
		}
	}
	usageParts.push('[options]');
	sections.push(
		join.vertical([
			sectionTitle('USAGE', theme, ctx),
			styled(`  ${usageParts.join(' ')}`, {}, ctx),
		]),
	);

	// Arguments
	if (cmd.args.length > 0) {
		const argRows = cmd.args.map((arg) => renderArgRow(arg, theme, ctx));
		sections.push(join.vertical([sectionTitle('ARGUMENTS', theme, ctx), indent(table(argRows))]));
	}

	// Options (grouped)
	if (cmd.options.length > 0) {
		sections.push(renderOptionsSection(cmd.options, theme, ctx));
	}

	// Subcommands
	if (cmd.subcommands && cmd.subcommands.length > 0) {
		const cmdRows = cmd.subcommands.map((sub) => [
			styled(sub.name, { color: 'yellow' }, ctx),
			sub.description || '',
		]);
		sections.push(join.vertical([sectionTitle('COMMANDS', theme, ctx), indent(table(cmdRows))]));
	}

	return sections;
}

// ─── Options Rendering ──────────────────────────────────────

function renderOptionsSection(
	options: OptionSchema[],
	theme: ResolvedTheme,
	ctx: RenderContext,
): Block {
	// Separate options by group
	const grouped = new Map<string, OptionSchema[]>();
	const ungrouped: OptionSchema[] = [];

	for (const opt of options) {
		if (opt.group) {
			const list = grouped.get(opt.group) ?? [];
			list.push(opt);
			grouped.set(opt.group, list);
		} else {
			ungrouped.push(opt);
		}
	}

	const parts: Block[] = [];

	// Ungrouped options first
	if (ungrouped.length > 0) {
		parts.push(
			join.vertical([
				sectionTitle('OPTIONS', theme, ctx),
				indent(renderOptionsTable(ungrouped, theme, ctx)),
			]),
		);
	}

	// Each group gets its own section
	for (const [group, opts] of grouped) {
		parts.push(
			join.vertical([
				sectionTitle(`${group.toUpperCase()} OPTIONS`, theme, ctx),
				indent(renderOptionsTable(opts, theme, ctx)),
			]),
		);
	}

	// If everything was grouped and there's no ungrouped section
	if (parts.length === 0) return '';

	return join.vertical(parts, { gap: 1 });
}

function renderOptionsTable(
	options: OptionSchema[],
	theme: ResolvedTheme,
	ctx: RenderContext,
): Block {
	const rows = options.map((opt) => renderOptionRow(opt, theme, ctx));
	return table(rows);
}

function renderOptionRow(opt: OptionSchema, theme: ResolvedTheme, ctx: RenderContext): Block[] {
	// Flag column: --name, -alias
	const flags: string[] = [];
	if (opt.alias) {
		for (const a of opt.alias) {
			// Aliases may come with dash prefix ('-e', '--env') or bare ('e', 'env')
			if (a.startsWith('--') || a.startsWith('-')) {
				flags.push(a);
			} else {
				flags.push(a.length === 1 ? `-${a}` : `--${a}`);
			}
		}
	}
	flags.push(`--${opt.name}`);
	const flagStr = styled(flags.join(', '), { color: 'yellow' }, ctx);

	// Type column
	const typeParts: string[] = [];
	if (opt.type === 'enum' && opt.enumValues) {
		typeParts.push(opt.enumValues.join(' | '));
	} else if (opt.type !== 'boolean') {
		typeParts.push(opt.type);
	}
	const typeStr = typeParts.length > 0 ? styled(typeParts.join(''), { dim: true }, ctx) : '';

	// Description column
	const descParts: string[] = [];
	if (opt.description) descParts.push(opt.description);
	if (opt.required) descParts.push(fg('(required)', theme.secondary));
	if (opt.defaultValue !== undefined)
		descParts.push(fg(`[default: ${String(opt.defaultValue)}]`, theme.muted));
	if (opt.deprecated) descParts.push(fg(`(deprecated: ${opt.deprecated})`, theme.warning));
	if (opt.env) descParts.push(fg(`[env: ${opt.env}]`, theme.muted));

	return [flagStr, typeStr, descParts.join(' ')];
}

// ─── Argument Rendering ─────────────────────────────────────

function renderArgRow(arg: ArgSchema, theme: ResolvedTheme, ctx: RenderContext): Block[] {
	// Name column
	const nameDisplay = arg.isVariadic ? `${arg.name}...` : arg.name;
	const nameStr = styled(
		arg.required ? `<${nameDisplay}>` : `[${nameDisplay}]`,
		{ color: 'yellow' },
		ctx,
	);

	// Type column
	const typeParts: string[] = [];
	if (arg.type === 'enum' && arg.enumValues) {
		typeParts.push(arg.enumValues.join(' | '));
	} else {
		typeParts.push(arg.type);
	}
	const typeStr = styled(typeParts.join(''), { dim: true }, ctx);

	// Description column
	const descParts: string[] = [];
	if (arg.description) descParts.push(arg.description);
	if (arg.required) descParts.push(fg('(required)', theme.secondary));
	if (arg.defaultValue !== undefined)
		descParts.push(fg(`[default: ${String(arg.defaultValue)}]`, theme.muted));

	return [nameStr, typeStr, descParts.join(' ')];
}

// ─── Helpers ────────────────────────────────────────────────

function sectionTitle(title: string, theme: ResolvedTheme, _ctx: RenderContext): Block {
	// theme colors are already ANSI-resolved, so use fg() directly (not styled.color which re-downsamples)
	return ansiBold(fg(title, theme.primary));
}

function indent(block: Block, spaces = 2): Block {
	const prefix = ' '.repeat(spaces);
	return block
		.split('\n')
		.map((line) => `${prefix}${line}`)
		.join('\n');
}
