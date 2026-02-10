import type { Context } from 'hono';
import { HistoryDB } from '../../storage/db.js';

/**
 * GET /api/trends?experiment=name&evaluator=name
 * Get score trends over time
 */
export async function getTrends(c: Context) {
	try {
		const { experiment, evaluator } = c.req.query();

		if (!experiment) {
			return c.json({ error: 'Missing experiment query param' }, 400);
		}

		const db = new HistoryDB();
		const runs = db.getRuns({ experiment });
		db.close();

		// Extract trends data
		const trends = runs.map((run) => {
			const scores = evaluator ? { [evaluator]: run.avgScores[evaluator] } : run.avgScores;

			return {
				id: run.id,
				timestamp: run.timestamp,
				scores,
			};
		});

		// Sort by timestamp (oldest first for trend visualization)
		trends.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

		return c.json({ trends });
	} catch (error) {
		console.error('Failed to get trends:', error);
		return c.json({ error: 'Failed to get trends' }, 500);
	}
}
