import { box, defaultRenderer, join, type RenderFnCtx, styled, table } from '@runa-cmd/help';

/** The help of the CLI drawn your way. A command's help keeps the default one. */
export function renderHelp(ctx: RenderFnCtx): string {
	const { schema, theme } = ctx;
	// `schema` is the CLI, or the command whose help was asked for
	if (!('meta' in schema)) return defaultRenderer(ctx);

	// styled(), not bold(): it leaves out ANSI codes where the output can't show them
	return join.vertical([
		box({
			content: `${styled(schema.meta.name, { bold: true })} v${schema.meta.version}`,
			border: 'rounded',
			borderColor: theme.primary,
		}),
		styled(schema.meta.description ?? '', { color: theme.muted }),
		table(
			schema.commands.map((cmd) => [
				styled(cmd.name, { bold: true, color: theme.primary }),
				styled(cmd.description, { color: theme.muted }),
			]),
			{ headers: ['Command', 'Description'] },
		),
	]);
}
