#!/usr/bin/env node
import { runCLI } from '@runa-cmd/core';
import { badge } from './cli.ts';

await runCLI(badge);
