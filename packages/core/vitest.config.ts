import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test-d.ts'],
		typecheck: {
			include: ['src/__tests__/**/*.test-d.ts'],
		},
		coverage: {
			// ADR-0015: 80% lines on core. The threshold lives HERE, not in workflow
			// YAML — CI just runs with --coverage; this config decides pass/fail.
			// MAY be ratcheted up, MUST NOT be lowered silently.
			// Runs only when invoked with --coverage.
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/__tests__/**'],
			thresholds: {
				lines: 80,
			},
		},
	},
});
