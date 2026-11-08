import { CommandError, defineMiddleware } from '@runa-cmd/core';

/**
 * Stops the commands that write when the global `readOnly` is on. It names
 * commands by their whole path: `task remove` and a `remove` elsewhere are
 * different commands.
 */
export function readOnly(writes: string[]) {
	return defineMiddleware(async ({ command, globalOptions, next }) => {
		const path = command.path.join(' ');
		if (globalOptions.readOnly && writes.includes(path)) {
			throw new CommandError(`'${path}' changes data, and read-only mode is on.`, {
				code: 'READ_ONLY',
				exitCode: 3,
			});
		}
		await next();
	});
}
