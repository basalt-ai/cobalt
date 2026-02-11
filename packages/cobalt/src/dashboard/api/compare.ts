import type { Context } from 'hono';
import { loadResult } from '../../storage/results.js';
import type { ExperimentReport, ExperimentSummary, ItemEvaluation } from '../../types/index.js';

interface CompareRunInfo {
	id: string;
	name: string;
	timestamp: string;
	summary: ExperimentSummary;
}

interface CompareItemOutput {
	output: unknown;
	latencyMs: number;
	evaluations: Record<string, ItemEvaluation>;
	error?: string;
}

/**
 * GET /api/compare?a=runId1&b=runId2&c=runId3 (c is optional)
 * Compare 2 or 3 experiment runs side-by-side
 */
export async function compareRuns(c: Context) {
	try {
		const { a, b, c: cId } = c.req.query();

		if (!a || !b) {
			return c.json({ error: 'Missing run IDs (a and b query params required)' }, 400);
		}

		// Load runs
		const reports: ExperimentReport[] = [await loadResult(a), await loadResult(b)];
		if (cId) {
			reports.push(await loadResult(cId));
		}

		// Build run info
		const runs: CompareRunInfo[] = reports.map((r) => ({
			id: r.id,
			name: r.name,
			timestamp: r.timestamp,
			summary: r.summary,
		}));

		// Collect all evaluator names across all runs
		const allEvaluators = new Set<string>();
		for (const report of reports) {
			for (const name of Object.keys(report.summary.scores)) {
				allEvaluators.add(name);
			}
		}

		// Score diffs: per evaluator, one avg score per run
		const scoreDiffs: Record<string, { scores: number[]; diffs: number[] }> = {};
		for (const evaluator of allEvaluators) {
			const scores = reports.map((r) => r.summary.scores[evaluator]?.avg ?? 0);
			const baseline = scores[0];
			const diffs = scores.map((s) => s - baseline);
			scoreDiffs[evaluator] = { scores, diffs };
		}

		// Build items with outputs from each run
		const maxItems = Math.max(...reports.map((r) => r.items.length));
		const items: Array<{
			index: number;
			input: unknown;
			outputs: (CompareItemOutput | null)[];
		}> = [];

		for (let i = 0; i < maxItems; i++) {
			const baseItem = reports.find((r) => r.items[i])?.items[i];
			items.push({
				index: i,
				input: baseItem?.input ?? {},
				outputs: reports.map((r) => {
					const item = r.items[i];
					if (!item) return null;
					return {
						output: item.output,
						latencyMs: item.latencyMs,
						evaluations: item.evaluations,
						error: item.error,
					};
				}),
			});
		}

		return c.json({ runs, scoreDiffs, items });
	} catch (error) {
		console.error('Failed to compare runs:', error);
		return c.json({ error: 'Failed to compare runs' }, 500);
	}
}
