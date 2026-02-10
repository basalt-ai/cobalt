#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
	meta: {
		name: 'cobalt',
		version: '0.1.0',
		description: 'Jest for AI Agents — test, evaluate, and track your AI experiments',
	},
	subCommands: {
		init: () => import('./commands/init.js').then((m) => m.default),
		run: () => import('./commands/run.js').then((m) => m.default),
		serve: () => import('./commands/serve.js').then((m) => m.default),
		history: () => import('./commands/history.js').then((m) => m.default),
		compare: () => import('./commands/compare.js').then((m) => m.default),
		clean: () => import('./commands/clean.js').then((m) => m.default),
		mcp: () => import('./commands/mcp.js').then((m) => m.default),
	},
});

runMain(main);
