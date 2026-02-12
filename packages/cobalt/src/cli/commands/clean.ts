import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';
export default defineCommand({
	meta: {
		name: 'clean',
		description: 'Clean cache and old results',
	},
	args: {
		cache: {
			type: 'boolean',
			description: 'Only clean cache',
			alias: 'c',
		},
		results: {
			type: 'boolean',
			description: 'Only clean results',
			alias: 'r',
		},
		days: {
			type: 'string',
			description: 'Delete results older than N days',
			alias: 'd',
		},
		force: {
			type: 'boolean',
			description: 'Skip confirmation prompt',
			alias: 'f',
		},
	},
	async run({ args }) {
		try {
			const dataDir = resolve(process.cwd(), '.cobalt', 'data');

			if (!existsSync(dataDir)) {
				console.log(pc.yellow('\nNo .cobalt directory found.\n'));
				return;
			}

			const cleanCache = !args.results;
			const cleanResults = !args.cache;

			console.log(pc.bold('\n🔷 Cobalt Cleanup\n'));

			// Calculate what will be deleted
			const toDelete: string[] = [];

			if (cleanCache) {
				const cachePath = join(dataDir, 'cache');
				if (existsSync(cachePath)) {
					toDelete.push('Cache');
				}
			}

			if (cleanResults) {
				const resultsPath = join(dataDir, 'results');
				if (existsSync(resultsPath)) {
					const files = await readdir(resultsPath);

					if (args.days) {
						const daysOld = Number.parseInt(args.days, 10);
						const cutoffDate = new Date();
						cutoffDate.setDate(cutoffDate.getDate() - daysOld);

						const oldFiles = files.filter((file) => {
							const filePath = join(resultsPath, file);
							const stat = require('node:fs').statSync(filePath);
							return stat.mtime < cutoffDate;
						});

						if (oldFiles.length > 0) {
							toDelete.push(`Results older than ${daysOld} days (${oldFiles.length} files)`);
						}
					} else {
						if (files.length > 0) {
							toDelete.push(`All results (${files.length} files)`);
						}
					}
				}
			}

			if (toDelete.length === 0) {
				console.log(pc.dim('Nothing to clean.\n'));
				return;
			}

			// Show what will be deleted
			console.log('Will delete:');
			for (const item of toDelete) {
				console.log(pc.dim(`  - ${item}`));
			}
			console.log('');

			// Confirm
			if (!args.force) {
				console.log(pc.yellow('⚠ This action cannot be undone.'));
				console.log(pc.dim('Use --force to skip this confirmation.\n'));
				process.exit(0);
			}

			// Perform cleanup
			if (cleanCache) {
				const cachePath = join(dataDir, 'cache');
				if (existsSync(cachePath)) {
					await rm(cachePath, { recursive: true, force: true });
					console.log(pc.green('✓ Cache cleaned'));
				}
			}

			if (cleanResults) {
				const resultsPath = join(dataDir, 'results');

				if (args.days) {
					const daysOld = Number.parseInt(args.days, 10);
					const cutoffDate = new Date();
					cutoffDate.setDate(cutoffDate.getDate() - daysOld);

					const files = await readdir(resultsPath);

					for (const file of files) {
						const filePath = join(resultsPath, file);
						const stat = require('node:fs').statSync(filePath);

						if (stat.mtime < cutoffDate) {
							await rm(filePath);
						}
					}

					console.log(pc.green(`✓ Cleaned results older than ${daysOld} days`));
				} else {
					if (existsSync(resultsPath)) {
						await rm(resultsPath, { recursive: true, force: true });
						console.log(pc.green('✓ All results cleaned'));
					}

					const historyPath = join(dataDir, 'history.db');
					if (existsSync(historyPath)) {
						await rm(historyPath);
						console.log(pc.green('✓ History database cleaned'));
					}
				}
			}

			console.log(pc.bold(pc.green('\n✅ Cleanup complete!\n')));
		} catch (error) {
			console.error(pc.red('\n❌ Cleanup failed:'), error);
			process.exit(1);
		}
	},
});
