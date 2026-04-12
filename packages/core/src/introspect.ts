/**
 * @runa-cmd/core — Schema introspection
 *
 * getSchema() walks the command tree and extracts structured metadata
 * (CLISchema) for use by plugins (help, MCP, completions).
 */
import type { ZodType } from 'zod';
import { walkSchema } from './parse/schema-walker.js';
import type {
	ArgSchema,
	CLIConfig,
	CLISchema,
	Command,
	CommandSchema,
	CommandTree,
	OptionMeta,
	OptionSchema,
} from './types.js';

// ─── Helpers ────────────────────────────────────────────────

function isCommand(value: Command | CommandTree): value is Command {
	return '_type' in value && value._type === 'runa:command';
}

/**
 * Walk a command and extract its schema information.
 */
function walkCommand(name: string, command: Command, parentPath: string[]): CommandSchema {
	const fullPath = [...parentPath, name];

	// Extract arg schemas
	const argSchemas: ArgSchema[] = [];
	if (command.args) {
		const metadata = walkSchema(command.args);
		for (const meta of metadata) {
			argSchemas.push({
				name: meta.name,
				description: meta.description,
				type: meta.zodType,
				required: !meta.isOptional,
				defaultValue: meta.defaultValue,
				isVariadic: meta.isArray,
				enumValues: meta.enumValues,
			});
		}
	}

	// Extract option schemas
	const optionSchemas: OptionSchema[] = [];
	if (command.options) {
		const metadata = walkSchema(command.options);
		const optMeta = (command.meta.options ?? {}) as Record<string, OptionMeta>;
		for (const meta of metadata) {
			const om = optMeta[meta.name];
			optionSchemas.push({
				name: meta.name,
				description: meta.description,
				type: meta.zodType,
				required: !meta.isOptional,
				defaultValue: meta.defaultValue,
				alias: om?.alias,
				env: om?.env,
				group: om?.group,
				deprecated: om?.deprecated,
				hint: om?.hint,
				enumValues: meta.enumValues,
			});
		}
	}

	return {
		name,
		description: command.meta.description,
		fullPath,
		args: argSchemas,
		options: optionSchemas,
		hasOutput: !!command.output,
	};
}

/**
 * Recursively walk a command tree and extract schemas for all commands.
 */
function walkTree(tree: CommandTree, parentPath: string[]): CommandSchema[] {
	const schemas: CommandSchema[] = [];

	for (const [name, entry] of Object.entries(tree)) {
		if (isCommand(entry)) {
			schemas.push(walkCommand(name, entry, parentPath));
		} else {
			// It's a subtree — recurse and collect as subcommands
			const subcommands = walkTree(entry, [...parentPath, name]);
			schemas.push({
				name,
				description: '',
				fullPath: [...parentPath, name],
				args: [],
				options: [],
				hasOutput: false,
				subcommands,
			});
		}
	}

	return schemas;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Extract the full CLI schema for introspection.
 *
 * Used by plugins (help, MCP, completions) to discover commands,
 * args, options, and metadata without executing anything.
 */
export function getSchema(
	config: CLIConfig,
	extraGlobalOptions?: Record<string, ZodType>,
	extraGlobalMeta?: Record<string, OptionMeta>,
): CLISchema {
	// Walk the command tree
	const commands = walkTree(config.commands, []);

	// Extract global option schemas
	const globalOptionSchemas: OptionSchema[] = [];
	const allGlobalOptions = {
		...(config.globalOptions ?? {}),
		...(extraGlobalOptions ?? {}),
	};
	const allGlobalMeta = {
		...(config.globalMeta?.options ?? {}),
		...(extraGlobalMeta ?? {}),
	};

	if (Object.keys(allGlobalOptions).length > 0) {
		const metadata = walkSchema(allGlobalOptions);
		for (const meta of metadata) {
			const om = allGlobalMeta[meta.name];
			globalOptionSchemas.push({
				name: meta.name,
				description: meta.description,
				type: meta.zodType,
				required: !meta.isOptional,
				defaultValue: meta.defaultValue,
				alias: om?.alias,
				env: om?.env,
				group: om?.group,
				deprecated: om?.deprecated,
				hint: om?.hint,
				enumValues: meta.enumValues,
			});
		}
	}

	return {
		meta: config.meta,
		commands,
		globalOptions: globalOptionSchemas,
	};
}
