/**
 * The command line of `npm create @runa-cmd`, with Runa's rules and without
 * Runa: --help, -h and --version, no -v (ADR-0021), and exit 2 on a usage
 * error, saying what's wrong and where the help is (T-239).
 */
import { parseArgs } from 'node:util';
import { CreateError, createProject, nextSteps } from './create.js';

export interface CliContext {
	/** This package's version, for --version */
	version: string;
	templateDir: string;
	/** The core the template was built with */
	runaVersion: string;
	cwd: string;
	/** npm_config_user_agent: the package manager that ran it */
	userAgent: string | undefined;
	out: (text: string) => void;
	err: (text: string) => void;
}

const USAGE = `Create a CLI made with Runa.

Usage: npm create @runa-cmd <name>

  <name>          The folder, the package and the command, as in my-tool
  -h, --help      Show this
  --version       Show the version`;

/** npm reads its own flags first: these only reach the generator after -- */
const HINT = "Run 'npm create @runa-cmd -- --help' for usage.";

const OPTIONS = { help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' } } as const;

class UsageError extends Error {}

/** What was asked for, or why it can't be read, in our words and not parseArgs'. */
function read(argv: string[]): { help: boolean; version: boolean; name: string } {
	const { tokens } = parseArgs({
		args: argv,
		options: OPTIONS,
		allowPositionals: true,
		strict: false,
		tokens: true,
	});
	const asked = { help: false, version: false };
	const names: string[] = [];

	for (const token of tokens) {
		if (token.kind === 'positional') names.push(token.value);
		if (token.kind !== 'option') continue;
		if (!(token.name in OPTIONS)) throw new UsageError(`Unknown option '${token.rawName}'.`);
		if (token.value !== undefined) throw new UsageError(`Option '--${token.name}' takes no value.`);
		asked[token.name as keyof typeof asked] = true;
	}

	if (asked.help || asked.version) return { ...asked, name: '' };
	const [name, extra] = names;
	if (name === undefined) {
		throw new UsageError("Missing the name of the project, as in 'npm create @runa-cmd my-tool'.");
	}
	if (extra !== undefined) {
		throw new UsageError(
			`Unexpected argument '${extra}': the name is a single word, as in 'my-tool'.`,
		);
	}
	return { ...asked, name };
}

/** Runs the generator, and returns its exit code. */
export function main(argv: string[], ctx: CliContext): number {
	let args: ReturnType<typeof read>;
	try {
		args = read(argv);
	} catch (error) {
		if (!(error instanceof UsageError)) throw error;
		ctx.err(`${error.message}\n${HINT}`);
		return 2;
	}

	if (args.help) {
		ctx.out(USAGE);
		return 0;
	}
	if (args.version) {
		ctx.out(ctx.version);
		return 0;
	}

	try {
		const { templateDir, runaVersion, cwd } = ctx;
		createProject({ name: args.name, cwd, templateDir, runaVersion });
	} catch (error) {
		if (!(error instanceof CreateError)) throw error;
		ctx.err(error.message);
		return 2;
	}

	ctx.out(nextSteps(args.name, ctx.userAgent));
	return 0;
}
