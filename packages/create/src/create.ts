/**
 * @runa-cmd/create — Make a new CLI project (T-605)
 *
 * The template is the project of the getting started guide, so what this
 * creates is what the guide teaches, and CI runs both. It installs nothing:
 * which package manager to use, and when, is the person's call.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Something the person can fix: a name, or a folder that's taken. */
export class CreateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CreateError';
	}
}

export interface CreateOptions {
	/** The project, its folder, its package and the program it installs */
	name: string;
	/** Where the folder goes */
	cwd: string;
	/** A copy of examples/getting-started */
	templateDir: string;
	/** The @runa-cmd/core the project depends on */
	runaVersion: string;
}

/** A name that works as a folder, an npm package and a command a person types. */
const PROJECT_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The files copied as they are: they're the code the guide shows. */
const COPIED = ['tsconfig.json', 'src/cli.ts', 'src/main.ts', 'src/cli.test.ts'];

const GITIGNORE = 'node_modules/\ndist/\n';

function readme(name: string): string {
	return `# ${name}

A CLI made with [Runa](https://github.com/jrodrigopuca/runa-cmd).

\`\`\`bash
node src/main.ts hello Ana   # Run it
node --test src/cli.test.ts  # Test it
npm run build                # Build dist/, which is what gets installed
npm install -g .             # Install it as ${name}
\`\`\`

The commands are in \`src/cli.ts\`. The [getting started guide](https://github.com/jrodrigopuca/runa-cmd/blob/main/guides/getting-started.md) explains every file.
`;
}

function packageJson(templateDir: string, name: string, runaVersion: string): string {
	const template = JSON.parse(readFileSync(join(templateDir, 'package.json'), 'utf8'));
	const pkg = {
		name,
		// The one src/cli.ts prints with --version, so they start equal
		version: template.version,
		description: '',
		type: template.type,
		bin: { [name]: 'dist/main.js' },
		files: template.files,
		scripts: template.scripts,
		dependencies: { '@runa-cmd/core': `^${runaVersion}`, zod: template.dependencies.zod },
		devDependencies: template.devDependencies,
		engines: template.engines,
	};
	return `${JSON.stringify(pkg, null, '\t')}\n`;
}

function named(cli: string, name: string): string {
	const marker = "name: 'greet'";
	if (!cli.includes(marker)) throw new Error(`The template lost ${marker}: update the generator.`);
	return cli.replace(marker, `name: '${name}'`);
}

/** Create the project, or explain why not before writing anything. */
export function createProject(options: CreateOptions): { dir: string } {
	const { name, cwd, templateDir, runaVersion } = options;

	if (!PROJECT_NAME.test(name)) {
		throw new CreateError(
			`'${name}' can't be the name: use lowercase letters, numbers and dashes, as in 'my-tool'. It's also what people type to run it.`,
		);
	}

	const dir = resolve(cwd, name);
	if (existsSync(dir) && readdirSync(dir).length > 0) {
		throw new CreateError(
			`The folder '${name}' already has files. Pick another name, or empty it.`,
		);
	}

	mkdirSync(join(dir, 'src'), { recursive: true });
	for (const file of COPIED) {
		const content = readFileSync(join(templateDir, file), 'utf8');
		writeFileSync(join(dir, file), file === 'src/cli.ts' ? named(content, name) : content);
	}
	writeFileSync(join(dir, 'package.json'), packageJson(templateDir, name, runaVersion));
	writeFileSync(join(dir, '.gitignore'), GITIGNORE);
	writeFileSync(join(dir, 'README.md'), readme(name));

	return { dir };
}

/** What to run next, with the package manager that ran the generator. */
export function nextSteps(name: string, userAgent: string | undefined): string {
	const manager =
		['pnpm', 'yarn', 'bun'].find((tool) => userAgent?.startsWith(`${tool}/`)) ?? 'npm';
	const build = `${manager === 'npm' ? 'npm run' : manager} build`;
	const test = 'node --test src/cli.test.ts';
	const width = Math.max(build.length, test.length) + 2;

	return `
Created ${name}. Next:

  cd ${name}
  ${manager} install
  node src/main.ts hello Ana

  ${test.padEnd(width)}# Test it
  ${build.padEnd(width)}# Build it before installing or publishing
`;
}
