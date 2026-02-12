import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createJiti } from 'jiti';
import { loadConfig } from '../../core/config.js';
import { drainPendingExperiments } from '../../core/experiment.js';
import type { ExperimentReport } from '../../types/index.js';

/**
 * MCP Tool: cobalt_run
 * Run cobalt experiments and return structured results
 */
export const cobaltRunTool = {
	name: 'cobalt_run',
	description:
		'Run cobalt experiments and return structured results with scores per evaluator and per item.',
	inputSchema: {
		type: 'object',
		properties: {
			file: {
				type: 'string',
				description:
					'Path to a specific experiment file. If omitted, runs all experiments in testDir.',
			},
			filter: {
				type: 'string',
				description: 'Filter experiments by name (substring match).',
			},
			concurrency: {
				type: 'number',
				description: 'Override concurrency setting.',
			},
		},
	},
};

export async function handleCobaltRun(args: any) {
	// Set up result capture via global callback
	const capturedReports: ExperimentReport[] = [];
	(global as any).__cobaltMCPResultCallback = (report: ExperimentReport) => {
		capturedReports.push(report);
	};

	try {
		const config = await loadConfig();

		// Determine which files to run
		let files: string[] = [];

		if (args.file) {
			const filepath = resolve(process.cwd(), args.file);
			if (!existsSync(filepath)) {
				throw new Error(`File not found: ${args.file}`);
			}
			files = [filepath];
		} else {
			// For now, just return error - file discovery would be complex
			throw new Error('File parameter required for MCP tool. Specify the experiment file to run.');
		}

		// Execute experiment file
		const jiti = createJiti(import.meta.url, {
			interopDefault: true,
		});

		for (const file of files) {
			// Import and execute - the experiment() call will run automatically
			// Results will be captured via the global callback
			await jiti.import(file, { default: true });

			// Wait for all experiment() calls that started during import
			await drainPendingExperiments();
		}

		// Verify we captured results
		if (capturedReports.length === 0) {
			throw new Error('No experiment reports captured - did the file call experiment()?');
		}

		// Return full experiment results
		const result = capturedReports.length === 1 ? capturedReports[0] : capturedReports;

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
						null,
						2,
					),
				},
			],
			isError: true,
		};
	} finally {
		// Clean up global callback
		(global as any).__cobaltMCPResultCallback = undefined;
		(globalThis as any).__cobaltPendingExperiments = undefined;
	}
}
