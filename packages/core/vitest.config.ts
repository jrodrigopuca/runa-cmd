import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test-d.ts'],
		typecheck: {
			include: ['src/__tests__/**/*.test-d.ts'],
		},
		coverage: {
			// Report-only (beta-readiness task 1.3): thresholds are deliberately
			// ABSENT until task 3.10 flips enforcement on (80% lines), after the
			// Phase 2/3 tests land. Runs only when invoked with --coverage.
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['src/__tests__/**'],
		},
	},
});
