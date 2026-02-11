import { mkdirSync, rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryDB } from '../../../src/storage/db.js';
import type { ExperimentReport } from '../../../src/types/index.js';
import { getTempTestDir } from '../../helpers/mocks.js';

function createReport(overrides: Partial<ExperimentReport> = {}): ExperimentReport {
	return {
		id: 'run-001',
		name: 'test-experiment',
		timestamp: '2025-02-05T14:30:00.000Z',
		tags: ['test', 'v1'],
		config: { runs: 1, concurrency: 5, timeout: 30000, evaluators: ['relevance'] },
		summary: {
			totalItems: 3,
			totalDurationMs: 1260,
			avgLatencyMs: 420,
			totalTokens: 450,
			estimatedCost: 0.01,
			scores: {
				relevance: { avg: 0.85, min: 0.75, max: 0.95, p50: 0.85, p95: 0.93 },
			},
		},
		items: [],
		...overrides,
	};
}

describe('HistoryDB', () => {
	let db: HistoryDB;
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = getTempTestDir();
		mkdirSync(tmpDir, { recursive: true });
		db = new HistoryDB(`${tmpDir}/history.db`);
	});

	afterEach(() => {
		db.close();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe('insertRun and getRunById', () => {
		it('should insert and retrieve a run', () => {
			const report = createReport();
			db.insertRun(report);

			const result = db.getRunById('run-001');

			expect(result).not.toBeNull();
			expect(result!.id).toBe('run-001');
			expect(result!.name).toBe('test-experiment');
			expect(result!.timestamp).toBe('2025-02-05T14:30:00.000Z');
		});

		it('should store tags as parsed array', () => {
			db.insertRun(createReport({ tags: ['prod', 'v2'] }));

			const result = db.getRunById('run-001');

			expect(result!.tags).toEqual(['prod', 'v2']);
		});

		it('should calculate avgScores from scores', () => {
			db.insertRun(createReport());

			const result = db.getRunById('run-001');

			expect(result!.avgScores).toEqual({ relevance: 0.85 });
		});

		it('should return null for nonexistent ID', () => {
			const result = db.getRunById('nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('getRuns', () => {
		it('should return all runs sorted by timestamp DESC', () => {
			db.insertRun(createReport({ id: 'old', timestamp: '2025-01-01T00:00:00.000Z' }));
			db.insertRun(createReport({ id: 'new', timestamp: '2025-06-01T00:00:00.000Z' }));

			const results = db.getRuns();

			expect(results).toHaveLength(2);
			expect(results[0].id).toBe('new');
			expect(results[1].id).toBe('old');
		});

		it('should filter by experiment name', () => {
			db.insertRun(createReport({ id: '1', name: 'agent-a' }));
			db.insertRun(createReport({ id: '2', name: 'agent-b' }));

			const results = db.getRuns({ experiment: 'agent-a' });

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('agent-a');
		});

		it('should filter by date range (since)', () => {
			db.insertRun(createReport({ id: 'old', timestamp: '2025-01-01T00:00:00.000Z' }));
			db.insertRun(createReport({ id: 'new', timestamp: '2025-06-01T00:00:00.000Z' }));

			const results = db.getRuns({ since: new Date('2025-03-01') });

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe('new');
		});

		it('should filter by date range (until)', () => {
			db.insertRun(createReport({ id: 'old', timestamp: '2025-01-01T00:00:00.000Z' }));
			db.insertRun(createReport({ id: 'new', timestamp: '2025-06-01T00:00:00.000Z' }));

			const results = db.getRuns({ until: new Date('2025-03-01') });

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe('old');
		});

		it('should filter by tags (any match)', () => {
			db.insertRun(createReport({ id: '1', tags: ['production', 'v1'] }));
			db.insertRun(createReport({ id: '2', tags: ['staging'] }));

			const results = db.getRuns({ tags: ['production'] });

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe('1');
		});

		it('should return empty array for no matches', () => {
			db.insertRun(createReport({ name: 'other' }));

			const results = db.getRuns({ experiment: 'nonexistent' });

			expect(results).toEqual([]);
		});
	});

	describe('deleteOldRuns', () => {
		it('should delete runs before specified date', () => {
			db.insertRun(createReport({ id: 'old', timestamp: '2025-01-01T00:00:00.000Z' }));
			db.insertRun(createReport({ id: 'new', timestamp: '2025-06-01T00:00:00.000Z' }));

			const deleted = db.deleteOldRuns(new Date('2025-03-01'));

			expect(deleted).toBe(1);
			expect(db.getRunById('old')).toBeNull();
			expect(db.getRunById('new')).not.toBeNull();
		});

		it('should return 0 when nothing to delete', () => {
			db.insertRun(createReport({ timestamp: '2025-06-01T00:00:00.000Z' }));

			const deleted = db.deleteOldRuns(new Date('2025-01-01'));

			expect(deleted).toBe(0);
		});
	});

	describe('getStats', () => {
		it('should return correct counts and timestamps', () => {
			db.insertRun(createReport({ id: 'a', timestamp: '2025-01-01T00:00:00.000Z' }));
			db.insertRun(createReport({ id: 'b', timestamp: '2025-06-01T00:00:00.000Z' }));

			const stats = db.getStats();

			expect(stats.totalRuns).toBe(2);
			expect(stats.oldestRun).toBe('2025-01-01T00:00:00.000Z');
			expect(stats.newestRun).toBe('2025-06-01T00:00:00.000Z');
		});

		it('should return zeros for empty database', () => {
			const stats = db.getStats();

			expect(stats.totalRuns).toBe(0);
			expect(stats.oldestRun).toBeNull();
			expect(stats.newestRun).toBeNull();
		});
	});

	describe('close', () => {
		it('should close without error', () => {
			expect(() => db.close()).not.toThrow();
		});
	});
});
