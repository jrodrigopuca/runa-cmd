/**
 * @runa-cmd/core/testing — Test a CLI without a child process (ADR-0041)
 *
 * The output of a process is one for everyone, so swapping it per run mixes up
 * runs at the same time, and loses what the test runner reports through it.
 * Output is routed by async context instead: each write finds the run it came
 * from, and anything else goes where it always went.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { format } from 'node:util';
import { type RunHarness, rootConfig, runWithHarness } from './cli.js';
import { ProcessExit } from './errors.js';
import type { TraceEvent } from './trace.js';
import type { CLI, CLIConfig, Command, RunCLIOptions } from './types.js';

export type { TraceEvent, ValueSource } from './trace.js';

export interface TestOptions
	extends Pick<RunCLIOptions, 'plugins' | 'middleware' | 'globalOptions' | 'globalMeta'> {
	/** What Runa sees as the environment. It doesn't read the real one */
	env?: Record<string, string | undefined>;
	/** The contents of the config file. No file is read */
	config?: Record<string, unknown>;
}

export interface TestResult {
	/** The exit code the process would end with */
	code: number;
	stdout: string;
	stderr: string;
	/** What run() returned */
	result: unknown;
	/** The original error of a failed run */
	error?: Error;
	/** What happened, in order. Its shape isn't part of the versioning contract */
	trace: TraceEvent[];
}

interface Capture {
	stdout: string;
	stderr: string;
	trace: TraceEvent[];
}

const capture = new AsyncLocalStorage<Capture>();

function record(run: Capture, stream: 'stdout' | 'stderr', text: string): void {
	run[stream] += text;
	run.trace.push({ step: 'output', stream, text });
}

function routedWrite(stream: 'stdout' | 'stderr', real: typeof process.stdout.write) {
	return function write(
		chunk: string | Uint8Array,
		encoding?: BufferEncoding | ((error?: Error | null) => void),
		callback?: (error?: Error | null) => void,
	): boolean {
		const run = capture.getStore();
		if (!run) return real.call(process[stream], chunk, encoding as BufferEncoding, callback);

		record(run, stream, typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
		const done = typeof encoding === 'function' ? encoding : callback;
		done?.();
		return true;
	} as typeof process.stdout.write;
}

const CONSOLE_STREAMS = {
	log: 'stdout',
	info: 'stdout',
	debug: 'stdout',
	warn: 'stderr',
	error: 'stderr',
} as const;

type ConsoleMethod = keyof typeof CONSOLE_STREAMS;

/**
 * A runner can replace console, and then console.log never reaches
 * process.stdout: both have to be routed.
 */
function routeOutput(): () => void {
	const { stdout, stderr, exit } = process;
	const realOut = stdout.write;
	const realErr = stderr.write;
	const realConsole = Object.fromEntries(
		Object.keys(CONSOLE_STREAMS).map((method) => [method, console[method as ConsoleMethod]]),
	) as Record<ConsoleMethod, typeof console.log>;

	const out = routedWrite('stdout', realOut);
	const err = routedWrite('stderr', realErr);
	const leave = ((code?: number) => {
		if (!capture.getStore()) return exit(code);
		throw new ProcessExit(code ?? 0);
	}) as typeof process.exit;

	stdout.write = out;
	stderr.write = err;
	process.exit = leave;

	const routed = {} as Record<ConsoleMethod, typeof console.log>;
	for (const method of Object.keys(CONSOLE_STREAMS) as ConsoleMethod[]) {
		routed[method] = (...args: unknown[]) => {
			const run = capture.getStore();
			if (!run) return realConsole[method].apply(console, args);
			record(run, CONSOLE_STREAMS[method], `${format(...args)}\n`);
		};
		console[method] = routed[method];
	}

	return () => {
		// Whoever replaced them after us keeps them
		if (stdout.write === out) stdout.write = realOut;
		if (stderr.write === err) stderr.write = realErr;
		if (process.exit === leave) process.exit = exit;
		for (const method of Object.keys(CONSOLE_STREAMS) as ConsoleMethod[]) {
			if (console[method] === routed[method]) console[method] = realConsole[method];
		}
	};
}

let active = 0;
let restoreOutput: (() => void) | undefined;

function enter(): void {
	active += 1;
	restoreOutput ??= routeOutput();
}

function leave(): void {
	active -= 1;
	if (active > 0) return;
	restoreOutput?.();
	restoreOutput = undefined;
}

function isCLI(target: CLI | Command): target is CLI {
	return target._type === 'runa:cli';
}

/** What runCLI() builds from a command, or the CLI as it was defined. */
function configOf(target: CLI | Command, options: TestOptions): [CLIConfig, string | undefined] {
	if (isCLI(target)) return [target.config, undefined];

	const { plugins, middleware, globalOptions, globalMeta } = options;
	const name = target.meta.name ?? 'command';
	return [rootConfig(target, name, { plugins, middleware, globalOptions, globalMeta }), name];
}

/**
 * Run a CLI or a command through its real lifecycle, without ending the process.
 *
 * @param argv - What would follow the name of the program at the terminal
 */
export async function testCLI(
	target: CLI | Command,
	argv: string[] = [],
	options: TestOptions = {},
): Promise<TestResult> {
	const run: Capture = { stdout: '', stderr: '', trace: [] };
	const outcome: { code?: number; result?: unknown; error?: Error } = {};

	const harness: RunHarness = {
		env: options.env ?? {},
		configValues: options.config,
		trace: (event) => run.trace.push(event),
		onResult: (value) => {
			outcome.result = value;
		},
		onError: (error) => {
			outcome.error = error;
		},
		onExit: (code) => {
			outcome.code = code;
		},
	};

	const [config, rootName] = configOf(target, options);
	const exitCodeBefore = process.exitCode;

	enter();
	try {
		await capture.run(run, () => runWithHarness(config, argv, rootName, harness));
	} catch (err) {
		if (!(err instanceof ProcessExit)) throw err;
		outcome.code = err.exitCode;
	} finally {
		leave();
	}

	// A command can set it instead of exiting, and it must not outlive the run
	const setByCommand = process.exitCode === exitCodeBefore ? undefined : process.exitCode;
	process.exitCode = exitCodeBefore;

	return {
		code: outcome.code ?? Number(setByCommand ?? 0),
		stdout: run.stdout,
		stderr: run.stderr,
		result: outcome.result,
		error: outcome.error,
		trace: run.trace,
	};
}
