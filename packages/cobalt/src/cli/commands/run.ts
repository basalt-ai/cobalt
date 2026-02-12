import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { defineCommand } from 'citty';
import { createJiti } from 'jiti';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { drainPendingExperiments } from '../../core/experiment.js';
import type { ExperimentReport } from '../../types/index.js';

export default defineCommand({
	meta: {
		name: 'run',
		description: 'Run cobalt experiments',
	},
	args: {
		file: {
			type: 'string',
			description: 'Specific experiment file to run',
			alias: 'f',
		},
		filter: {
			type: 'string',
			description: 'Filter experiments by name or tags',
			alias: 'n',
		},
		concurrency: {
			type: 'string',
			description: 'Override concurrency setting',
			alias: 'c',
		},
		ci: {
			type: 'boolean',
			description: 'Enable CI mode with threshold validation and exit codes',
			default: false,
		},
	},
	async run({ args }) {
		// Auto-load .env file if present
		try {
			const dotenv = await import('dotenv');
			dotenv.config();
		} catch {
			// dotenv not available, skip
		}

		console.log(pc.bold('\n🔷 Cobalt\n'));

		try {
			// Load configuration
			const config = await loadConfig();

			// Determine which files to run
			let files: string[] = [];

			if (args.file) {
				// Run specific file
				const filepath = resolve(process.cwd(), args.file);
				if (!existsSync(filepath)) {
					console.error(pc.red(`\n❌ File not found: ${args.file}\n`));
					process.exit(1);
				}
				files = [filepath];
			} else {
				// Find all experiment files
				// Search in testDir if it exists, otherwise fall back to cwd
				const testDir = resolve(process.cwd(), config.testDir);
				const searchDir = existsSync(testDir) ? testDir : process.cwd();

				files = await findExperimentFiles(searchDir, config.testMatch);

				if (files.length === 0) {
					console.error(pc.red('\n❌ No experiment files found'));
					console.log(pc.dim('Create files matching patterns:'), config.testMatch.join(', '));
					console.log(pc.dim('Or run "npx cobalt init" to create an example\n'));
					process.exit(1);
				}
			}

			// Apply file-level filtering by filename
			if (args.filter) {
				const filterLower = args.filter.toLowerCase();
				files = files.filter((f) => basename(f).toLowerCase().includes(filterLower));

				if (files.length === 0) {
					console.error(pc.red(`\n❌ No experiment files matching filter: ${args.filter}\n`));
					process.exit(1);
				}
			}

			console.log(pc.dim(`Found ${files.length} experiment file(s)\n`));

			// Execute each experiment file
			const jiti = createJiti(import.meta.url, {
				interopDefault: true,
			});

			// Collect experiment reports for CI mode checking
			const reports: ExperimentReport[] = [];

			// Set up global callback to capture experiment reports
			(global as any).__cobaltCLIResultCallback = (report: ExperimentReport) => {
				reports.push(report);
			};

			// Set up global overrides for experiment()
			if (args.ci && config.thresholds) {
				(global as any).__cobaltCIThresholds = config.thresholds;
			}
			if (args.concurrency) {
				const concurrencyValue = Number.parseInt(args.concurrency, 10);
				if (Number.isNaN(concurrencyValue) || concurrencyValue < 1) {
					console.error(pc.red('\n❌ Invalid concurrency value. Must be a positive integer.\n'));
					process.exit(1);
				}
				(global as any).__cobaltConcurrencyOverride = concurrencyValue;
			}
			if (args.filter) {
				(global as any).__cobaltFilter = args.filter;
			}

			try {
				for (const file of files) {
					try {
						console.log(pc.bold(`Running: ${relative(process.cwd(), file)}\n`));

						// Import and execute the file
						// The experiment() call inside the file will execute automatically
						await jiti.import(file, { default: true });

						// Wait for all experiment() calls that started during import
						await drainPendingExperiments();

						console.log('');
					} catch (error) {
						if (error instanceof Error && error.message === 'Dataset is empty') {
							console.error(pc.red(`\n❌ Dataset is empty in ${file}`));
							console.log(pc.dim('  Ensure your dataset has at least one item.\n'));
						} else {
							console.error(pc.red(`\n❌ Error running ${file}:`), error);
						}
						console.log('');
					}
				}
			} finally {
				// Clean up globals
				(global as any).__cobaltCLIResultCallback = undefined;
				(global as any).__cobaltCIThresholds = undefined;
				(global as any).__cobaltConcurrencyOverride = undefined;
				(global as any).__cobaltFilter = undefined;
				(globalThis as any).__cobaltPendingExperiments = undefined;
			}

			// Check for CI mode failures (only exit with code 1 when --ci is active)
			if (args.ci) {
				const ciFailures = reports.filter((r) => r.ciStatus && !r.ciStatus.passed);

				if (ciFailures.length > 0) {
					console.log(
						pc.red(
							pc.bold(`\n❌ CI Mode: ${ciFailures.length} experiment(s) failed threshold checks\n`),
						),
					);
					for (const report of ciFailures) {
						console.log(pc.red(`   ${report.name}: ${report.ciStatus!.summary}`));
					}
					console.log('');
					process.exit(1);
				}
			}

			console.log(pc.green(pc.bold('✅ All experiments completed!\n')));
		} catch (error) {
			console.error(pc.red('\n❌ Failed to run experiments:'), error);
			process.exit(1);
		}
	},
});

/**
 * Find experiment files matching patterns
 */
async function findExperimentFiles(dir: string, patterns: string[]): Promise<string[]> {
	const files: string[] = [];

	async function scan(currentDir: string) {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and hidden directories
				if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
					continue;
				}
				await scan(fullPath);
			} else if (entry.isFile()) {
				// Check if file matches any pattern
				const relativePath = fullPath.replace(`${dir}/`, '');
				for (const pattern of patterns) {
					if (matchPattern(relativePath, pattern)) {
						files.push(fullPath);
						break;
					}
				}
			}
		}
	}

	await scan(dir);
	return files;
}

/**
 * Simple pattern matching (supports ** and *)
 */
function matchPattern(path: string, pattern: string): boolean {
	// Convert glob pattern to regex character by character
	// to avoid chained .replace() corrupting intermediate results
	let regexStr = '';
	let i = 0;

	while (i < pattern.length) {
		if (pattern[i] === '*' && pattern[i + 1] === '*') {
			if (pattern[i + 2] === '/') {
				// **/ matches zero or more directories
				regexStr += '(.*/)?';
				i += 3;
			} else {
				regexStr += '.*';
				i += 2;
			}
		} else if (pattern[i] === '*') {
			regexStr += '[^/]*';
			i++;
		} else if (pattern[i] === '?') {
			regexStr += '.';
			i++;
		} else if (pattern[i] === '.') {
			regexStr += '\\.';
			i++;
		} else {
			regexStr += pattern[i];
			i++;
		}
	}

	return new RegExp(`^${regexStr}$`).test(path);
}
