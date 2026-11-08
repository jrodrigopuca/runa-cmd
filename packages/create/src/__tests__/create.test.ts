/**
 * The generator creates what the getting started guide teaches (T-605): the
 * template is examples/getting-started, so a project it creates runs, tests
 * and builds the same way.
 */
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CreateError, createProject, nextSteps } from '../create.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const templateDir = join(repo, 'examples', 'getting-started');
const coreDir = join(repo, 'packages', 'core');
const require = createRequire(import.meta.url);
// From its bin, as npm does: TypeScript 7 doesn't export bin/tsc as a path
const typescript = dirname(require.resolve('typescript/package.json'));
const tsc = join(typescript, require('typescript/package.json').bin.tsc);

let cwd: string;
beforeEach(() => {
	cwd = mkdtempSync(join(tmpdir(), 'runa-create-'));
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

const create = (name: string) => createProject({ name, cwd, templateDir, runaVersion: '9.9.9' });
const read = (dir: string, file: string) => readFileSync(join(dir, file), 'utf8');

describe('createProject', () => {
	it('creates the files of the guide, and a gitignore and a readme', () => {
		const { dir } = create('my-tool');
		for (const file of [
			'package.json',
			'tsconfig.json',
			'src/cli.ts',
			'src/main.ts',
			'src/cli.test.ts',
			'.gitignore',
			'README.md',
		]) {
			expect(existsSync(join(dir, file)), file).toBe(true);
		}
	});

	it('names the package, the program and the CLI after the project', () => {
		const { dir } = create('my-tool');
		const pkg = JSON.parse(read(dir, 'package.json'));

		expect(pkg.name).toBe('my-tool');
		expect(pkg.bin).toEqual({ 'my-tool': 'dist/main.js' });
		expect(read(dir, 'src/cli.ts')).toContain("name: 'my-tool'");
	});

	it('starts with the version that --version prints', () => {
		const { dir } = create('my-tool');
		const { version } = JSON.parse(read(dir, 'package.json'));

		expect(read(dir, 'src/cli.ts')).toContain(`version: '${version}'`);
	});

	it('depends on the Runa it was published with, and nothing of the workspace', () => {
		const pkg = JSON.parse(read(create('my-tool').dir, 'package.json'));

		expect(pkg.dependencies['@runa-cmd/core']).toBe('^9.9.9');
		expect(pkg.dependencies.zod).toBeDefined();
		expect(JSON.stringify(pkg)).not.toContain('workspace:');
		expect(pkg.private).toBeUndefined();
		expect(pkg.type).toBe('module');
		expect(pkg.files).toEqual(['dist']);
	});

	it('keeps the code of the guide as it is', () => {
		const { dir } = create('my-tool');
		expect(read(dir, 'src/main.ts')).toBe(read(templateDir, 'src/main.ts'));
		expect(read(dir, 'src/cli.test.ts')).toBe(read(templateDir, 'src/cli.test.ts'));
		expect(read(dir, 'tsconfig.json')).toBe(read(templateDir, 'tsconfig.json'));
	});

	it('refuses a folder that already has files', () => {
		mkdirSync(join(cwd, 'taken'));
		writeFileSync(join(cwd, 'taken', 'notes.txt'), 'mine');

		expect(() => create('taken')).toThrow(CreateError);
		expect(read(join(cwd, 'taken'), 'notes.txt')).toBe('mine');
	});

	it('uses an empty folder that already exists', () => {
		mkdirSync(join(cwd, 'empty'));
		expect(() => create('empty')).not.toThrow();
	});

	it.each(['My-Tool', 'my tool', '../escape', 'my_tool', '', '-tool'])(
		'refuses %j as a name',
		(name) => {
			expect(() => create(name)).toThrow(CreateError);
		},
	);
});

describe('nextSteps', () => {
	it('uses the package manager that ran it', () => {
		expect(nextSteps('my-tool', 'pnpm/10.12.1 npm/? node/v24')).toContain('pnpm install');
		expect(nextSteps('my-tool', 'npm/11.0.0 node/v24')).toContain('npm install');
		expect(nextSteps('my-tool', undefined)).toContain('npm install');
	});

	it('says how to run, test and build', () => {
		const steps = nextSteps('my-tool', 'npm/11.0.0 node/v24');
		expect(steps).toContain('cd my-tool');
		expect(steps).toContain('hello');
		expect(steps).toContain('test');
		expect(steps).toContain('build');
	});
});

describe('a project it creates', () => {
	// The packages of this repo stand in for npm, so this runs offline
	function install(dir: string) {
		mkdirSync(join(dir, 'node_modules', '@runa-cmd'), { recursive: true });
		symlinkSync(coreDir, join(dir, 'node_modules', '@runa-cmd', 'core'), 'junction');
		const zod = dirname(createRequire(join(coreDir, 'package.json')).resolve('zod/package.json'));
		symlinkSync(zod, join(dir, 'node_modules', 'zod'), 'junction');
		const nodeTypes = dirname(
			createRequire(join(templateDir, 'package.json')).resolve('@types/node/package.json'),
		);
		mkdirSync(join(dir, 'node_modules', '@types'));
		symlinkSync(nodeTypes, join(dir, 'node_modules', '@types', 'node'), 'junction');
	}

	const node = (dir: string, ...args: string[]) =>
		spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });

	it('runs, passes its tests and builds a program', () => {
		const { dir } = create('my-tool');
		install(dir);

		expect(node(dir, 'src/main.ts', 'hello', 'Ana').stdout).toBe('Hello, Ana!\n');
		expect(node(dir, '--test', 'src/cli.test.ts').status).toBe(0);

		const build = node(dir, tsc);
		expect(build.status, build.stdout).toBe(0);
		expect(node(dir, 'dist/main.js', 'hello', 'Ana').stdout).toBe('Hello, Ana!\n');
		expect(node(dir, 'dist/main.js', '--version').stdout).toBe('1.0.0\n');
	}, 60_000);

	// Since TypeScript 6, @types/node only loads if tsconfig asks for it
	it('builds code that uses Node', () => {
		const { dir } = create('my-tool');
		install(dir);
		writeFileSync(
			join(dir, 'src', 'files.ts'),
			"import { readFileSync } from 'node:fs';\nexport const read = (path: string) => readFileSync(path, 'utf8');\n",
		);

		const build = node(dir, tsc);
		expect(build.status, build.stdout).toBe(0);
	}, 60_000);
});
