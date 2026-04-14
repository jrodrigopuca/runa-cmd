#!/usr/bin/env node
import { completionsPlugin } from '@runa-cmd/completions';
/**
 * Runa Demo CLI — A realistic deployment tool showcasing every framework feature.
 *
 * Features demonstrated:
 * - Multi-command CLI with nested subcommands (config get/set/list)
 * - Positional args, variadic args, enum options
 * - Option metadata: aliases, env vars, groups, hints, deprecation
 * - Typed output schemas (validated returns)
 * - Middleware (onion model with timing)
 * - Global options (--verbose)
 * - Plugin system (help, mcp, completions — all 3 plugins)
 * - Config file loading (runa-demo.config.json)
 *
 * Try it:
 *   pnpm dev -- --help
 *   pnpm dev -- deploy api --env staging
 *   pnpm dev -- deploy api --env staging --verbose --dry-run
 *   pnpm dev -- config list
 *   pnpm dev -- config set deploy.replicas 4
 *   pnpm dev -- logs api -f -n 100
 *   pnpm dev -- completions bash
 *   pnpm dev -- --mcp
 */
import { defineCLI, jsonLoader } from '@runa-cmd/core';
import { z } from '@runa-cmd/core/zod';
import { helpPlugin } from '@runa-cmd/help';
import { mcpPlugin } from '@runa-cmd/mcp';

import { configGet, configList, configSet } from './commands/config.js';
import { deploy } from './commands/deploy.js';
import { init } from './commands/init.js';
import { logs } from './commands/logs.js';
import { timer } from './middleware.js';

const cli = defineCLI({
	meta: {
		name: 'runa-demo',
		version: '0.1.0',
		description: 'A deployment CLI built with Runa — showcasing every framework feature',
	},

	// Global option metadata (aliases)
	globalMeta: {
		options: {
			verbose: { alias: ['-V'] },
		},
	},

	// Global options — available to ALL commands
	globalOptions: {
		verbose: z.boolean().default(false).describe('Enable verbose output'),
	},

	// Commands — flat + nested subcommands
	commands: {
		deploy,
		init,
		logs,
		config: {
			get: configGet,
			set: configSet,
			list: configList,
		},
	},

	// Middleware — onion model
	middleware: [timer],

	// Plugins — help, mcp, completions
	plugins: [
		helpPlugin({
			theme: {
				primary: '#7D56F4',
				secondary: '#FF6B6B',
			},
		}),
		mcpPlugin(),
		completionsPlugin(),
	],

	// Config file loading
	config: {
		name: 'runa-demo',
		loaders: [jsonLoader()],
		searchPaths: ['.'],
	},
});

cli.run();
