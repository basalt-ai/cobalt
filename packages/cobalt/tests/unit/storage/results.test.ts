import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExperimentReport } from '../../../src/types/index.js';

// Mock node:fs
vi.mock('node:fs', () => ({
	existsSync: vi.fn().mockReturnValue(true),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	writeFile: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue('{}'),
	readdir: vi.fn().mockResolvedValue([]),
}));

import { listResults, loadResult, saveResult } from '../../../src/storage/results.js';

function createReport(overrides: Partial<ExperimentReport> = {}): ExperimentReport {
	return {
		id: 'abc123',
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

describe('saveResult', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create results directory if missing', async () => {
		const { existsSync } = await import('node:fs');
		const { mkdir } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(false);

		await saveResult(createReport());

		expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('results'), { recursive: true });
	});

	it('should generate correct filename format', async () => {
		const { writeFile } = await import('node:fs/promises');

		const report = createReport({
			id: 'def456',
			name: 'my-agent',
			timestamp: '2025-03-10T09:15:00.000Z',
		});
		await saveResult(report);

		const filepath = vi.mocked(writeFile).mock.calls[0][0] as string;
		expect(filepath).toContain('2025-03-10T09-15-00');
		expect(filepath).toContain('my-agent');
		expect(filepath).toContain('def456');
		expect(filepath).toMatch(/\.json$/);
	});

	it('should sanitize experiment name in filename', async () => {
		const { writeFile } = await import('node:fs/promises');

		const report = createReport({ name: 'My Agent (v2.0)!' });
		await saveResult(report);

		const filepath = vi.mocked(writeFile).mock.calls[0][0] as string;
		expect(filepath).toContain('my-agent--v2-0--');
	});

	it('should write JSON with 2-space indentation', async () => {
		const { writeFile } = await import('node:fs/promises');

		const report = createReport();
		await saveResult(report);

		const content = vi.mocked(writeFile).mock.calls[0][1] as string;
		const parsed = JSON.parse(content);
		expect(parsed.id).toBe('abc123');
		expect(content).toContain('  "id"'); // 2-space indent
	});

	it('should return the full filepath', async () => {
		const result = await saveResult(createReport());

		expect(result).toContain('results');
		expect(result).toMatch(/\.json$/);
	});
});

describe('loadResult', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should find file by run ID suffix', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue([
			'2025-02-05T14-30-00_test_abc123.json',
			'2025-02-05T15-00-00_test_def456.json',
		] as any);
		vi.mocked(readFile).mockResolvedValue(JSON.stringify(createReport()));

		const result = await loadResult('abc123');

		expect(result.id).toBe('abc123');
	});

	it('should throw when results directory missing', async () => {
		const { existsSync } = await import('node:fs');
		vi.mocked(existsSync).mockReturnValue(false);

		await expect(loadResult('abc123')).rejects.toThrow('Results directory not found');
	});

	it('should throw when run ID not found', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue(['other_file.json'] as any);

		await expect(loadResult('nonexistent')).rejects.toThrow('No result found for run ID');
	});
});

describe('listResults', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return empty array when results dir missing', async () => {
		const { existsSync } = await import('node:fs');
		vi.mocked(existsSync).mockReturnValue(false);

		const results = await listResults();

		expect(results).toEqual([]);
	});

	it('should list all JSON files sorted newest first', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue([
			'old_test_aaa.json',
			'new_test_bbb.json',
		] as any);

		const oldReport = createReport({
			id: 'aaa',
			timestamp: '2025-01-01T00:00:00.000Z',
		});
		const newReport = createReport({
			id: 'bbb',
			timestamp: '2025-06-01T00:00:00.000Z',
		});

		vi.mocked(readFile)
			.mockResolvedValueOnce(JSON.stringify(oldReport))
			.mockResolvedValueOnce(JSON.stringify(newReport));

		const results = await listResults();

		expect(results).toHaveLength(2);
		expect(results[0].id).toBe('bbb'); // Newest first
		expect(results[1].id).toBe('aaa');
	});

	it('should filter by experiment name', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue(['a.json', 'b.json'] as any);

		const report1 = createReport({ id: '1', name: 'agent-a' });
		const report2 = createReport({ id: '2', name: 'agent-b' });

		vi.mocked(readFile)
			.mockResolvedValueOnce(JSON.stringify(report1))
			.mockResolvedValueOnce(JSON.stringify(report2));

		const results = await listResults({ experiment: 'agent-a' });

		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('agent-a');
	});

	it('should filter by tags (any match)', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue(['a.json', 'b.json'] as any);

		const report1 = createReport({ id: '1', tags: ['production'] });
		const report2 = createReport({ id: '2', tags: ['staging'] });

		vi.mocked(readFile)
			.mockResolvedValueOnce(JSON.stringify(report1))
			.mockResolvedValueOnce(JSON.stringify(report2));

		const results = await listResults({ tags: ['production'] });

		expect(results).toHaveLength(1);
		expect(results[0].tags).toContain('production');
	});

	it('should filter by date range', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue(['a.json', 'b.json'] as any);

		const report1 = createReport({ id: '1', timestamp: '2025-01-15T00:00:00.000Z' });
		const report2 = createReport({ id: '2', timestamp: '2025-03-15T00:00:00.000Z' });

		vi.mocked(readFile)
			.mockResolvedValueOnce(JSON.stringify(report1))
			.mockResolvedValueOnce(JSON.stringify(report2));

		const results = await listResults({
			since: new Date('2025-02-01'),
			until: new Date('2025-04-01'),
		});

		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('2');
	});

	it('should skip malformed JSON files', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue(['bad.json', 'good.json'] as any);

		vi.mocked(readFile)
			.mockResolvedValueOnce('not valid json')
			.mockResolvedValueOnce(JSON.stringify(createReport({ id: 'good' })));

		const results = await listResults();

		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('good');
	});

	it('should calculate avgScores from summary', async () => {
		const { existsSync } = await import('node:fs');
		const { readdir, readFile } = await import('node:fs/promises');
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readdir).mockResolvedValue(['a.json'] as any);

		const report = createReport({
			summary: {
				totalItems: 5,
				totalDurationMs: 2000,
				avgLatencyMs: 400,
				scores: {
					relevance: { avg: 0.9, min: 0.8, max: 1.0, p50: 0.9, p95: 0.98 },
					quality: { avg: 0.75, min: 0.6, max: 0.85, p50: 0.75, p95: 0.83 },
				},
			},
		});
		vi.mocked(readFile).mockResolvedValue(JSON.stringify(report));

		const results = await listResults();

		expect(results[0].avgScores).toEqual({
			relevance: 0.9,
			quality: 0.75,
		});
	});
});
