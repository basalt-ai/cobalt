import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ExperimentReport, ResultFilter, ResultSummary } from '../types/index.js';

/**
 * Save experiment results to file
 * @param report - Experiment report to save
 * @param outputDir - Output directory (default: .cobalt)
 * @returns Path to saved file
 */
export async function saveResult(report: ExperimentReport, outputDir = '.cobalt'): Promise<string> {
	const resultsDir = resolve(process.cwd(), outputDir, 'results');

	// Ensure directory exists
	if (!existsSync(resultsDir)) {
		await mkdir(resultsDir, { recursive: true });
	}

	// Generate filename: YYYY-MM-DDTHH-mm-ss_name_id.json
	const timestamp = new Date(report.timestamp).toISOString().replace(/:/g, '-').split('.')[0];
	const filename = `${timestamp}_${sanitizeFilename(report.name)}_${report.id}.json`;
	const filepath = join(resultsDir, filename);

	// Write report to file
	await writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');

	return filepath;
}

/**
 * Load experiment result by run ID
 * @param runId - Run ID to load
 * @param outputDir - Output directory (default: .cobalt)
 * @returns Experiment report
 */
export async function loadResult(runId: string, outputDir = '.cobalt'): Promise<ExperimentReport> {
	const resultsDir = resolve(process.cwd(), outputDir, 'results');

	if (!existsSync(resultsDir)) {
		throw new Error(`Results directory not found: ${resultsDir}`);
	}

	// Find file with matching run ID
	const files = await readdir(resultsDir);
	const matchingFile = files.find((f) => f.endsWith(`_${runId}.json`));

	if (!matchingFile) {
		throw new Error(`No result found for run ID: ${runId}`);
	}

	const filepath = join(resultsDir, matchingFile);
	const content = await readFile(filepath, 'utf-8');

	return JSON.parse(content) as ExperimentReport;
}

/**
 * List all experiment results
 * @param filter - Optional filter criteria
 * @param outputDir - Output directory (default: .cobalt)
 * @returns Array of result summaries
 */
export async function listResults(
	filter?: ResultFilter,
	outputDir = '.cobalt',
): Promise<ResultSummary[]> {
	const resultsDir = resolve(process.cwd(), outputDir, 'results');

	if (!existsSync(resultsDir)) {
		return [];
	}

	const files = await readdir(resultsDir);
	const jsonFiles = files.filter((f) => f.endsWith('.json'));

	const summaries: ResultSummary[] = [];

	for (const file of jsonFiles) {
		try {
			const filepath = join(resultsDir, file);
			const content = await readFile(filepath, 'utf-8');
			const report: ExperimentReport = JSON.parse(content);

			// Apply filters
			if (filter?.experiment && report.name !== filter.experiment) continue;
			if (filter?.tags && !filter.tags.some((tag) => report.tags.includes(tag))) continue;
			if (filter?.since && new Date(report.timestamp) < filter.since) continue;
			if (filter?.until && new Date(report.timestamp) > filter.until) continue;

			// Calculate average scores
			const avgScores: Record<string, number> = {};
			for (const [evaluator, stats] of Object.entries(report.summary.scores)) {
				avgScores[evaluator] = stats.avg;
			}

			summaries.push({
				id: report.id,
				name: report.name,
				timestamp: report.timestamp,
				tags: report.tags,
				avgScores,
				totalItems: report.summary.totalItems,
				durationMs: report.summary.totalDurationMs,
			});
		} catch (error) {
			console.warn(`Failed to parse result file ${file}:`, error);
		}
	}

	// Sort by timestamp (most recent first)
	summaries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

	return summaries;
}

/**
 * Sanitize filename (remove invalid characters)
 */
function sanitizeFilename(name: string): string {
	return name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
}
