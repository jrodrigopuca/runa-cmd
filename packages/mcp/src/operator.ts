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
import { longFlag, operatorValueProblem } from '@runa-cmd/core/internal';
import { MCP_ERROR_CODES } from './errors.js';
import type { ToolRegistration } from './schema.js';
import type { McpPluginOptions, ToolOptions } from './types.js';

const REDACTION = '[redacted]';

/** Shorter values could be any word, and replacing them would mangle the text. */
const MIN_REDACTED_LENGTH = 8;

export interface OperatorValues {
	/** The config file's values of each tool, by tool name */
	configValues?: Record<string, Record<string, unknown> | undefined>;
	env: Record<string, string | undefined>;
	/** Global options the server started with */
	globals: Record<string, unknown>;
}

type ExposureOptions = Pick<McpPluginOptions, 'exclude' | 'tools' | 'maxOutput'>;

function invalidTools(message: string): RunaError {
	return new RunaError(`mcpPlugin: ${message}`, { code: MCP_ERROR_CODES.MCP_INVALID_TOOLS });
}

function assertValidLimit(limit: number | undefined, owner: string): void {
	if (limit === undefined || (Number.isInteger(limit) && limit > 0)) return;
	throw invalidTools(`maxOutput of ${owner} must be a positive number of bytes.`);
}

function assertValidExclude(
	{ exclude = [], tools = {} }: ExposureOptions,
	registrations: ToolRegistration[],
): void {
	for (const name of exclude) {
		if (!registrations.some((reg) => reg.name === name)) {
			throw invalidTools(`no tool named '${name}' to exclude.`);
		}
		if (name in tools) throw invalidTools(`tool '${name}' is excluded, so it can't have settings.`);
	}
}

function assertValidTools(
	tools: NonNullable<McpPluginOptions['tools']>,
	registrations: ToolRegistration[],
): void {
	for (const [name, options] of Object.entries(tools)) {
		const reg = registrations.find((candidate) => candidate.name === name);
		if (!reg) throw invalidTools(`no tool named '${name}'.`);
		assertValidLimit(options.maxOutput, `tool '${name}'`);

		if (options.annotations?.readOnlyHint && options.annotations.destructiveHint) {
			throw invalidTools(`tool '${name}' can't be read-only and destructive.`);
		}

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
	return fromEnv ?? values.configValues?.[reg.name]?.[key];
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
	maxOutput: number | undefined,
	values: OperatorValues,
): ToolRegistration {
	const inputShape = { ...reg.inputShape };
	const fixed = new Set<string>();
	const fixedValues: unknown[] = [];
	const unconfigured: ToolRegistration['unconfigured'] = [];
	const misconfigured: ToolRegistration['misconfigured'] = [];

	for (const key of reg.optionKeys) {
		if (options.expose?.includes(key)) continue;

		const value = fixedValue(key, reg, values);
		const isServerOnly = options.serverOnly?.includes(key) ?? false;

		if (value === undefined && isServerOnly) {
			throw invalidTools(
				`option ${longFlag(key)} of tool '${reg.name}' is server-only and has no value. ` +
					'Set it through its env var or the config file.',
			);
		}

		const envName = envNameOf(key, reg);
		const belongsToOperator = value !== undefined || envName !== undefined;
		if (!belongsToOperator) continue;

		// A model can't send it, so without a value no call can run (T-236)
		const schema = inputShape[key];
		const required = schema?.safeParse(undefined).success === false;
		if (value === undefined && envName !== undefined && required) {
			unconfigured.push({ key, env: envName });
		}

		// Nor with a value that breaks its schema: checked as the CLI checks it (T-255)
		if (value !== undefined && schema) {
			const fromEnv = envName !== undefined && values.env[envName] !== undefined;
			const reason = operatorValueProblem(schema, value, fromEnv ? 'env' : 'config');
			if (reason !== undefined) {
				misconfigured.push(
					fromEnv
						? { key, env: envName, reason }
						: { key, configKey: [...reg.path, key].join('.'), reason },
				);
			}
		}

		delete inputShape[key];
		fixed.add(key);
		if (value !== undefined) fixedValues.push(value);
	}

	return {
		...reg,
		description: options.description ?? reg.description,
		annotations: options.annotations,
		inputShape,
		fixed,
		unconfigured,
		misconfigured,
		redactions: redactable([...fixedValues, ...Object.values(values.globals)]),
		maxOutput: options.maxOutput ?? maxOutput ?? reg.maxOutput,
	};
}

/** The tools as the model will see them. Fails at startup on an invalid setup. */
export function applyOperatorValues(
	registrations: ToolRegistration[],
	options: ExposureOptions,
	values: OperatorValues,
): ToolRegistration[] {
	const { exclude = [], tools = {}, maxOutput } = options;

	assertValidLimit(maxOutput, 'mcpPlugin');
	// An exclude can still name a command that's out: it says the same thing
	assertValidExclude(options, registrations);

	const offered = registrations.filter((reg) => reg.command.tool !== false);
	assertValidTools(tools, offered);

	return offered
		.filter((reg) => !exclude.includes(reg.name))
		.map((reg) => applyToTool(reg, tools[reg.name] ?? {}, maxOutput, values));
}

/** The variables, as `NOTES_FILE` or `A (--a) and B (--b)` with their flags. */
const listOf = (names: string[]): string =>
	names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : `${names[0]}`;

export function missingValues(reg: ToolRegistration, withFlags = false): string {
	return listOf(
		reg.unconfigured.map(({ key, env }) => (withFlags ? `${env} (${longFlag(key)})` : env)),
	);
}

/** Where a wrong value is: its variable, or its key in the config file. Never the value. */
function wrongValueAt(
	{ key, env, configKey }: ToolRegistration['misconfigured'][number],
	withFlags: boolean,
): string {
	if (env !== undefined) return withFlags ? `${env} (${longFlag(key)})` : env;
	return `'${configKey}' in the config file`;
}

/** What the model reads first: what the operator has to set, and what to fix. */
export function operatorNote(reg: ToolRegistration): string {
	const set = reg.unconfigured.length > 0 ? [`set ${missingValues(reg)}`] : [];
	const wrong = reg.misconfigured.map((item) => wrongValueAt(item, false));
	const fix = wrong.length > 0 ? [`fix ${listOf(wrong)}`] : [];
	return `The operator of this server has to ${[...set, ...fix].join(' and ')}. It isn't a value you can send.`;
}

/**
 * What the operator has to set or fix before each tool can run. Said at
 * startup, so it doesn't wait for a model to call the tool, and the server
 * keeps serving: the other tools work.
 */
export function unconfiguredWarnings(registrations: ToolRegistration[]): string[] {
	return registrations.flatMap((reg) => {
		const prefix = `mcpPlugin: tool '${reg.name}' can't run until the operator`;
		const missing =
			reg.unconfigured.length > 0 ? [`${prefix} sets ${missingValues(reg, true)}.`] : [];
		const wrong = reg.misconfigured.map(
			(item) => `${prefix} fixes ${wrongValueAt(item, true)}: ${item.reason}.`,
		);
		return [...missing, ...wrong];
	});
}

/** Hide fixed values from text a command wrote without meaning to expose them. */
export function redact(text: string, values: string[]): string {
	return values.reduce((result, value) => result.replaceAll(value, REDACTION), text);
}
