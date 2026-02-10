import type { Context } from 'hono';
import { HistoryDB } from '../../storage/db.js';
import { loadResult } from '../../storage/results.js';

/**
 * GET /api/runs
 * List all experiment runs
 */
export async function getRuns(c: Context) {
	try {
		const { experiment, tags, since, until, limit } = c.req.query();

		const filter: any = {};
		if (experiment) filter.experiment = experiment;
		if (tags) filter.tags = tags.split(',');
		if (since) filter.since = new Date(since);
		if (until) filter.until = new Date(until);

		const db = new HistoryDB();
		let runs = db.getRuns(filter);
		db.close();

		// Apply limit
		if (limit) {
			runs = runs.slice(0, Number.parseInt(limit, 10));
		}

		return c.json({ runs });
	} catch (error) {
		console.error('Failed to get runs:', error);
		return c.json({ error: 'Failed to get runs' }, 500);
	}
}

/**
 * GET /api/runs/:id
 * Get detailed run information
 */
export async function getRunDetail(c: Context) {
	try {
		const { id } = c.req.param();

		// Load full report from JSON file
		const report = await loadResult(id);

		return c.json({ run: report });
	} catch (error) {
		console.error(`Failed to get run ${c.req.param('id')}:`, error);
		return c.json({ error: 'Run not found' }, 404);
	}
}
