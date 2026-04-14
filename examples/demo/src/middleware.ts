/**
 * Timer middleware — Showcases:
 * - Koa/Hono onion model (before/after next())
 * - Accessing globalOptions
 * - Verbose-only output
 */
import { defineMiddleware } from '@runa-cmd/core';

export const timer = defineMiddleware(async ({ next, globalOptions }) => {
	const verbose = (globalOptions as Record<string, unknown>).verbose;
	const start = performance.now();

	await next();

	if (verbose) {
		const duration = (performance.now() - start).toFixed(0);
		console.log(`\n  \x1b[2m⏱  Done in ${duration}ms\x1b[22m`);
	}
});
