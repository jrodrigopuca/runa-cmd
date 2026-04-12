/**
 * @runa-cmd/mcp — Command → MCP tool schema mapping
 *
 * Walks the CommandTree and builds ToolRegistration objects
 * that map each command to an MCP tool with merged input schema.
 */
import type { CLISchema, Command, CommandSchema, CommandTree } from '@runa-cmd/core';
import type { ZodType } from 'zod';

// ─── Types ──────────────────────────────────────────────────

/**
 * Represents a single MCP tool registration derived from a CLI command.
 */
export interface ToolRegistration {
	/** MCP tool name (e.g., 'config_set') */
	name: string;
	/** Tool description from command metadata */
	description: string;
	/** Merged args + options as a Zod shape (Record<string, ZodType>) */
	inputShape: Record<string, ZodType>;
	/** Command output schema if defined */
	outputSchema?: ZodType;
	/** Reference to the Command for executing run() */
	command: Command;
	/** Keys that belong to args (for splitting input back on invocation) */
	argKeys: Set<string>;
	/** Keys that belong to options */
	optionKeys: Set<string>;
}

// ─── Helpers ────────────────────────────────────────────────

function isCommand(value: Command | CommandTree): value is Command {
	return '_type' in value && value._type === 'runa:command';
}

/**
 * Find the matching CommandSchema from CLISchema for a given fullPath.
 */
function findCommandSchema(
	schemas: CommandSchema[],
	fullPath: string[],
): CommandSchema | undefined {
	for (const schema of schemas) {
		if (pathsMatch(schema.fullPath, fullPath)) return schema;
		if (schema.subcommands) {
			const found = findCommandSchema(schema.subcommands, fullPath);
			if (found) return found;
		}
	}
	return undefined;
}

function pathsMatch(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((segment, i) => segment === b[i]);
}

// ─── Core ───────────────────────────────────────────────────

/**
 * Walk a CommandTree and build ToolRegistration[] for all leaf commands.
 * Group nodes (non-leaf, no run()) are skipped.
 */
function walkTree(
	tree: CommandTree,
	parentPath: string[],
	cliSchema: CLISchema,
): ToolRegistration[] {
	const registrations: ToolRegistration[] = [];

	for (const [name, entry] of Object.entries(tree)) {
		const fullPath = [...parentPath, name];

		if (isCommand(entry)) {
			const toolName = fullPath.join('_');
			const cmdSchema = findCommandSchema(cliSchema.commands, fullPath);

			// Merge args + options into a single input shape
			const inputShape: Record<string, ZodType> = {};
			const argKeys = new Set<string>();
			const optionKeys = new Set<string>();

			if (entry.args) {
				for (const [key, schema] of Object.entries(entry.args)) {
					inputShape[key] = schema;
					argKeys.add(key);
				}
			}

			if (entry.options) {
				for (const [key, schema] of Object.entries(entry.options)) {
					inputShape[key] = schema;
					optionKeys.add(key);
				}
			}

			registrations.push({
				name: toolName,
				description: cmdSchema?.description ?? entry.meta.description,
				inputShape,
				outputSchema: entry.output,
				command: entry,
				argKeys,
				optionKeys,
			});
		} else {
			// It's a subtree — recurse
			registrations.push(...walkTree(entry, fullPath, cliSchema));
		}
	}

	return registrations;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Build MCP tool registrations from a CommandTree and CLISchema.
 *
 * Walks the tree, maps each leaf command to a ToolRegistration with:
 * - Merged args + options as inputShape
 * - Output schema if defined
 * - Arg/option key sets for splitting input on invocation
 */
export function buildToolRegistrations(
	commands: CommandTree,
	schema: CLISchema,
): ToolRegistration[] {
	return walkTree(commands, [], schema);
}
