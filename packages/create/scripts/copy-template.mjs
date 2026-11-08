// Copies examples/getting-started into template/, the files the generator ships.
// The example runs its tests in CI, so the template is always code that works.
// It also records the core version built with it: the generator can't use its
// own, because the packages stop sharing a version after 1.0 (T-506).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const example = join(root, '..', '..', 'examples', 'getting-started');
const template = join(root, 'template');

rmSync(template, { recursive: true, force: true });
mkdirSync(join(template, 'src'), { recursive: true });
for (const file of ['package.json', 'tsconfig.json', 'src/cli.ts', 'src/main.ts', 'src/cli.test.ts']) {
	cpSync(join(example, file), join(template, file));
}

// A project starts with the version --version prints. `pnpm release` builds
// without running the tests, so the build itself refuses a template where the
// two differ, before anything is published.
const { version } = JSON.parse(readFileSync(join(example, 'package.json'), 'utf8'));
if (!readFileSync(join(example, 'src', 'cli.ts'), 'utf8').includes(`version: '${version}'`)) {
	console.error(
		`examples/getting-started: package.json says ${version}, and src/cli.ts doesn't. Make them match.`,
	);
	process.exit(1);
}

const core = JSON.parse(readFileSync(join(root, '..', 'core', 'package.json'), 'utf8'));
writeFileSync(join(template, 'runa.json'), `${JSON.stringify({ core: core.version })}\n`);
