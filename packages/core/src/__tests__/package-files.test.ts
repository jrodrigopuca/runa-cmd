/**
 * What each package really ships, asked to npm: `files` can list something that
 * isn't there, and a reader of the changelog only has what's in the tarball.
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface PackReport {
	files: Array<{ path: string }>;
}

const packages = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe.each(['core', 'help', 'mcp', 'completions'])('@runa-cmd/%s', (name) => {
	it('ships its README and its CHANGELOG', () => {
		const output = execSync('npm pack --dry-run --json --ignore-scripts', {
			cwd: join(packages, name),
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		});
		// An array up to npm 11, and an object by package name from npm 12
		const [entry] = Object.values(JSON.parse(output)).flat() as PackReport[];
		const paths = (entry?.files ?? []).map((file) => file.path);

		expect(paths).toContain('README.md');
		expect(paths).toContain('CHANGELOG.md');
	}, 30_000);
});
