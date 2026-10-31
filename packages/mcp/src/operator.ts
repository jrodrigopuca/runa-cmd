/**
 * @runa-cmd/mcp — What the operator of the server decides, not the model
 *
 * At the CLI, a flag beats env because the same person sets both. With a tool,
 * whoever starts the server and whoever calls the tool are different: an option
 * that declares env, or that has a value, stays out of the model's reach. The
 * rule doesn't depend on the value being set, or a forgotten API_TOKEN would
 * turn into a parameter the model can ask a person for.
 */
import { type OptionMeta, RunaError } from '@runa-cmd/core';
import type { ToolRegistration } from './schema.js';
import type { McpPluginOptions, ToolOptions } from './types.js';

const REDACTION = '[redacted]';

/** Shorter values could be any word, and replacing them would mangle the text. */
const MIN_REDACTED_LENGTH = 8;

export interface OperatorValues {
	configValues?: Record<string, unknown>;
	env: Record<string, string | undefined>;
	/** Global options the server started with */
	globals: Record<string, unknown>;
	/** The output limit of every tool without its own */
	maxOutput?: number;
}

function invalidTools(message: string): RunaError {
	return new RunaError(`mcpPlugin: ${message}`, { code: 'MCP_INVALID_TOOLS' });
}

function assertValidLimit(limit: number | undefined, owner: string): void {
	if (limit === undefined || (Number.isInteger(limit) && limit > 0)) return;
	throw invalidTools(`maxOutput of ${owner} must be a positive number of bytes.`);
}

function assertValidTools(
	tools: NonNullable<McpPluginOptions['tools']>,
	registrations: ToolRegistration[],
): void {
	for (const [name, options] of Object.entries(tools)) {
		const reg = registrations.find((candidate) => candidate.name === name);
		if (!reg) throw invalidTools(`no tool named '${name}'.`);
		assertValidLimit(options.maxOutput, `tool '${name}'`);

		for (const key of [...(options.expose ?? []), ...(options.serverOnly ?? [])]) {
			if (!reg.optionKeys.has(key)) {
				throw invalidTools(`tool '${name}' has no option '${key}'.`);
			}
			if (options.expose?.includes(key) && options.serverOnly?.includes(key)) {
				throw invalidTools(`option '${key}' of tool '${name}' can't be exposed and server-only.`);
			}
		}
	}
}

function envNameOf(key: string, reg: ToolRegistration): string | undefined {
	const optionMeta = reg.command.meta.options as Record<string, OptionMeta> | undefined;
	return optionMeta?.[key]?.env;
}

function fixedValue(key: string, reg: ToolRegistration, values: OperatorValues): unknown {
	const envName = envNameOf(key, reg);
	const fromEnv = envName === undefined ? undefined : values.env[envName];
	return fromEnv ?? values.configValues?.[key];
}

function redactable(values: unknown[]): string[] {
	return values
		.filter(
			(value): value is string => typeof value === 'string' && value.length >= MIN_REDACTED_LENGTH,
		)
		.sort((a, b) => b.length - a.length);
}

function applyToTool(
	reg: ToolRegistration,
	options: ToolOptions,
	values: OperatorValues,
): ToolRegistration {
	const inputShape = { ...reg.inputShape };
	const fixed = new Set<string>();
	const fixedValues: unknown[] = [];

	for (const key of reg.optionKeys) {
		if (options.expose?.includes(key)) continue;

		const value = fixedValue(key, reg, values);
		const isServerOnly = options.serverOnly?.includes(key) ?? false;

		if (value === undefined && isServerOnly) {
			throw invalidTools(
				`option --${key} of tool '${reg.name}' is server-only and has no value. ` +
					'Set it through its env var or the config file.',
			);
		}

		const belongsToOperator = value !== undefined || envNameOf(key, reg) !== undefined;
		if (!belongsToOperator) continue;

		delete inputShape[key];
		fixed.add(key);
		if (value !== undefined) fixedValues.push(value);
	}

	return {
		...reg,
		inputShape,
		fixed,
		redactions: redactable([...fixedValues, ...Object.values(values.globals)]),
		maxOutput: options.maxOutput ?? values.maxOutput ?? reg.maxOutput,
	};
}

/** The tools as the model will see them. Fails at startup on an invalid setup. */
export function applyOperatorValues(
	registrations: ToolRegistration[],
	tools: McpPluginOptions['tools'],
	values: OperatorValues,
): ToolRegistration[] {
	assertValidLimit(values.maxOutput, 'mcpPlugin');
	assertValidTools(tools ?? {}, registrations);
	return registrations.map((reg) => applyToTool(reg, tools?.[reg.name] ?? {}, values));
}

/** Hide fixed values from text a command wrote without meaning to expose them. */
export function redact(text: string, values: string[]): string {
	return values.reduce((result, value) => result.replaceAll(value, REDACTION), text);
}
