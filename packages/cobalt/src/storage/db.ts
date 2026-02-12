import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import type { ExperimentReport, ResultFilter, ResultSummary } from '../types/index.js';

/**
 * SQLite database for storing experiment run history
 * Used by the dashboard for querying and displaying results
 */
export class HistoryDB {
	private db: Database.Database;

	constructor(dbPath = '.cobalt/data/history.db') {
		const fullPath = resolve(process.cwd(), dbPath);

		// Ensure directory exists
		const dir = dirname(fullPath);
		if (!existsSync(dir)) {
			mkdir(dir, { recursive: true }).catch((err) => {
				console.error('Failed to create database directory:', err);
			});
		}

		// Open database
		this.db = new Database(fullPath);

		// Enable foreign keys
		this.db.pragma('foreign_keys = ON');

		// Initialize schema
		this.initSchema();
	}

	/**
	 * Initialize database schema
	 */
	private initSchema(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        tags TEXT NOT NULL,
        total_items INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        avg_latency_ms REAL NOT NULL,
        total_tokens INTEGER,
        estimated_cost REAL,
        scores TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_runs_timestamp ON runs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_runs_name ON runs(name);
      CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
    `);
	}

	/**
	 * Insert experiment run into database
	 * @param report - Experiment report to store
	 */
	insertRun(report: ExperimentReport): void {
		const stmt = this.db.prepare(`
      INSERT INTO runs (
        id, name, timestamp, tags, total_items, duration_ms,
        avg_latency_ms, total_tokens, estimated_cost, scores
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			report.id,
			report.name,
			report.timestamp,
			JSON.stringify(report.tags),
			report.summary.totalItems,
			report.summary.totalDurationMs,
			report.summary.avgLatencyMs,
			report.summary.totalTokens || null,
			report.summary.estimatedCost || null,
			JSON.stringify(report.summary.scores),
		);
	}

	/**
	 * Get all runs with optional filtering
	 * @param filter - Optional filter criteria
	 * @returns Array of result summaries
	 */
	getRuns(filter?: ResultFilter): ResultSummary[] {
		let query = 'SELECT * FROM runs WHERE 1=1';
		const params: any[] = [];

		if (filter?.experiment) {
			query += ' AND name = ?';
			params.push(filter.experiment);
		}

		if (filter?.since) {
			query += ' AND timestamp >= ?';
			params.push(filter.since.toISOString());
		}

		if (filter?.until) {
			query += ' AND timestamp <= ?';
			params.push(filter.until.toISOString());
		}

		query += ' ORDER BY timestamp DESC';

		const stmt = this.db.prepare(query);
		const rows = stmt.all(...params) as any[];

		return rows
			.map((row) => {
				const tags = JSON.parse(row.tags);
				const scores = JSON.parse(row.scores);

				// Calculate average scores
				const avgScores: Record<string, number> = {};
				for (const [evaluator, stats] of Object.entries(scores)) {
					avgScores[evaluator] = (stats as any).avg;
				}

				// Apply tag filter if specified
				if (filter?.tags && !filter.tags.some((tag) => tags.includes(tag))) {
					return null;
				}

				return {
					id: row.id,
					name: row.name,
					timestamp: row.timestamp,
					tags,
					avgScores,
					totalItems: row.total_items,
					durationMs: row.duration_ms,
				};
			})
			.filter(Boolean) as ResultSummary[];
	}

	/**
	 * Get run by ID
	 * @param runId - Run ID
	 * @returns Run summary or null
	 */
	getRunById(runId: string): ResultSummary | null {
		const stmt = this.db.prepare('SELECT * FROM runs WHERE id = ?');
		const row = stmt.get(runId) as any;

		if (!row) return null;

		const tags = JSON.parse(row.tags);
		const scores = JSON.parse(row.scores);

		const avgScores: Record<string, number> = {};
		for (const [evaluator, stats] of Object.entries(scores)) {
			avgScores[evaluator] = (stats as any).avg;
		}

		return {
			id: row.id,
			name: row.name,
			timestamp: row.timestamp,
			tags,
			avgScores,
			totalItems: row.total_items,
			durationMs: row.duration_ms,
		};
	}

	/**
	 * Delete old runs before a certain date
	 * @param beforeDate - Delete runs before this date
	 * @returns Number of deleted runs
	 */
	deleteOldRuns(beforeDate: Date): number {
		const stmt = this.db.prepare('DELETE FROM runs WHERE timestamp < ?');
		const result = stmt.run(beforeDate.toISOString());
		return result.changes;
	}

	/**
	 * Get database statistics
	 * @returns Database stats
	 */
	getStats(): { totalRuns: number; oldestRun: string | null; newestRun: string | null } {
		const totalRuns = this.db.prepare('SELECT COUNT(*) as count FROM runs').get() as any;
		const oldestRun = this.db
			.prepare('SELECT timestamp FROM runs ORDER BY timestamp ASC LIMIT 1')
			.get() as any;
		const newestRun = this.db
			.prepare('SELECT timestamp FROM runs ORDER BY timestamp DESC LIMIT 1')
			.get() as any;

		return {
			totalRuns: totalRuns.count,
			oldestRun: oldestRun?.timestamp || null,
			newestRun: newestRun?.timestamp || null,
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
