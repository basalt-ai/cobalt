import { join } from 'node:path';
import { loadConfig } from '../../core/config.js';
import { HistoryDB } from '../../storage/db.js';

/**
 * MCP Resource: cobalt://latest-results
 * Provides latest results for each experiment
 */
export const cobaltLatestResultsResource = {
	uri: 'cobalt://latest-results',
	name: 'Latest Results',
	description: 'Latest experiment results for each experiment',
	mimeType: 'application/json',
};

/**
 * Handle cobalt://latest-results resource request
 */
export async function handleCobaltLatestResults() {
	try {
		const config = await loadConfig();
		const dbPath = join(config.outputDir, 'history.db');

		// Open database
		const db = new HistoryDB(dbPath);

		// Get all runs
		const allRuns = db.getRuns();

		// Group by experiment name and get latest for each
		const latestByExperiment = new Map<string, any>();

		for (const run of allRuns) {
			const existing = latestByExperiment.get(run.name);

			// Keep the one with the most recent timestamp
			if (!existing || new Date(run.timestamp) > new Date(existing.timestamp)) {
				latestByExperiment.set(run.name, run);
			}
		}

		// Close database
		db.close();

		// Convert to array
		const latestResults = Array.from(latestByExperiment.values());

		return {
			contents: [
				{
					uri: 'cobalt://latest-results',
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							count: latestResults.length,
							results: latestResults,
						},
						null,
						2,
					),
				},
			],
		};
	} catch (error) {
		return {
			contents: [
				{
					uri: 'cobalt://latest-results',
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							error: error instanceof Error ? error.message : 'Failed to load latest results',
						},
						null,
						2,
					),
				},
			],
		};
	}
}
