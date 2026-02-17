import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock filesystem operations used by saveResult and HistoryDB
vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(false),
		mkdirSync: vi.fn(),
		writeFileSync: vi.fn(),
		readFileSync: actual.readFileSync,
	};
});

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	return {
		...actual,
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
	};
});

// Mock config to avoid file discovery
vi.mock('../../src/core/config.js', () => ({
	loadConfig: vi.fn().mockResolvedValue({
		testDir: './experiments',
		testMatch: ['**/*.cobalt.ts'],
		judge: { model: 'gpt-5-mini', provider: 'openai', apiKey: 'sk-test' },
		concurrency: 2,
		timeout: 10000,
		reporters: [],
		dashboard: { port: 4000, open: false },
		cache: { enabled: false, ttl: '7d' },
		plugins: [],
	}),
	getApiKey: vi.fn().mockReturnValue('sk-test'),
}));

// Mock HistoryDB to avoid real SQLite
vi.mock('../../src/storage/db.js', () => ({
	HistoryDB: vi.fn().mockImplementation(() => ({
		insertRun: vi.fn(),
		close: vi.fn(),
	})),
}));

import { experiment } from '../../src/core/experiment.js';
import { Dataset } from '../../src/datasets/Dataset.js';

// Ensure evaluators are registered
import '../../src/evaluators/function.js';

describe('Experiment Pipeline Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(global as any).__cobaltCLIResultCallback = undefined;
		(global as any).__cobaltMCPResultCallback = undefined;
		(global as any).__cobaltConcurrencyOverride = undefined;
		(global as any).__cobaltFilter = undefined;
	});

	afterEach(() => {
		(global as any).__cobaltCLIResultCallback = undefined;
		(global as any).__cobaltMCPResultCallback = undefined;
		(global as any).__cobaltConcurrencyOverride = undefined;
		(global as any).__cobaltFilter = undefined;
	});

	it('should run a full experiment with function evaluator and produce valid report', async () => {
		const dataset = new Dataset({
			items: [
				{ input: 'What is 2+2?', expectedOutput: '4' },
				{ input: 'What is 3+3?', expectedOutput: '6' },
			],
		});

		const runner = async ({ item }: { item: any }) => ({
			output: item.expectedOutput,
			metadata: {},
		});

		const report = await experiment('integration-test', dataset, runner, {
			evaluators: [
				{
					name: 'exact-match',
					type: 'function',
					fn: ({ output, item }) => ({
						score: output === item.expectedOutput ? 1 : 0,
						reason: output === item.expectedOutput ? 'Match' : 'No match',
					}),
				},
			],
		});

		// Verify report structure
		expect(report.id).toMatch(/^[0-9a-f]{12}$/);
		expect(report.name).toBe('integration-test');
		expect(report.timestamp).toBeDefined();
		expect(report.items).toHaveLength(2);

		// Verify all items scored 1 (exact match)
		for (const item of report.items) {
			expect(item.evaluations['exact-match'].score).toBe(1);
			expect(item.evaluations['exact-match'].reason).toBe('Match');
		}

		// Verify summary scores
		expect(report.summary.scores['exact-match'].avg).toBe(1);
		expect(report.summary.totalItems).toBe(2);
		expect(report.summary.totalDurationMs).toBeGreaterThanOrEqual(0);
	});

	it('should handle multiple evaluators in a single experiment', async () => {
		const dataset = new Dataset({
			items: [{ input: 'Hello', expectedOutput: 'Hello World' }],
		});

		const runner = async () => ({
			output: 'Hello World',
			metadata: {},
		});

		const report = await experiment('multi-eval', dataset, runner, {
			evaluators: [
				{
					name: 'always-pass',
					type: 'function',
					fn: () => ({ score: 1, reason: 'Always passes' }),
				},
				{
					name: 'length-check',
					type: 'function',
					fn: ({ output }) => ({
						score: String(output).length > 5 ? 1 : 0,
						reason: `Length: ${String(output).length}`,
					}),
				},
			],
		});

		expect(Object.keys(report.items[0].evaluations)).toEqual(['always-pass', 'length-check']);
		expect(report.summary.scores['always-pass'].avg).toBe(1);
		expect(report.summary.scores['length-check'].avg).toBe(1);
	});

	it('should capture runner errors gracefully', async () => {
		const dataset = new Dataset({
			items: [{ input: 'trigger-error' }],
		});

		const runner = async () => {
			throw new Error('Agent crashed');
		};

		const report = await experiment('error-test', dataset, runner, {
			evaluators: [
				{
					name: 'eval',
					type: 'function',
					fn: () => ({ score: 1 }),
				},
			],
		});

		expect(report.items[0].error).toBe('Agent crashed');
		// Evaluators should not have been called on failed items
		expect(report.items[0].evaluations).toEqual({});
	});

	it('should use options concurrency over config concurrency', async () => {
		const { loadConfig } = await import('../../src/core/config.js');
		vi.mocked(loadConfig).mockResolvedValueOnce({
			testDir: './experiments',
			testMatch: ['**/*.cobalt.ts'],
			judge: { model: 'gpt-5-mini', provider: 'openai', apiKey: 'sk-test' },
			concurrency: 5,
			timeout: 10000,
			reporters: [],
			dashboard: { port: 4000, open: false },
			cache: { enabled: false, ttl: '7d' },
			plugins: [],
		});

		const dataset = new Dataset({ items: [{ input: 'test' }] });
		const runner = async () => ({ output: 'ok', metadata: {} });

		const report = await experiment('concurrency-test', dataset, runner, {
			evaluators: [],
			concurrency: 1,
		});

		expect(report.config.concurrency).toBe(1); // options override
	});

	it('should apply global concurrency override over options', async () => {
		(global as any).__cobaltConcurrencyOverride = 2;

		const dataset = new Dataset({ items: [{ input: 'test' }] });
		const runner = async () => ({ output: 'ok', metadata: {} });

		const report = await experiment('global-override', dataset, runner, {
			evaluators: [],
			concurrency: 10,
		});

		expect(report.config.concurrency).toBe(2); // global override wins
	});

	it('should skip experiment when filter does not match', async () => {
		(global as any).__cobaltFilter = 'specific-name';

		const dataset = new Dataset({ items: [{ input: 'test' }] });
		const runner = vi.fn().mockResolvedValue({ output: 'ok' });

		const report = await experiment('different-experiment', dataset, runner, {
			evaluators: [],
		});

		// Runner should not have been called
		expect(runner).not.toHaveBeenCalled();
		expect(report.items).toHaveLength(0);
	});

	it('should NOT skip experiment when filter matches name', async () => {
		(global as any).__cobaltFilter = 'match';

		const dataset = new Dataset({ items: [{ input: 'test' }] });
		const runner = async () => ({ output: 'ok', metadata: {} });

		const report = await experiment('match-this', dataset, runner, {
			evaluators: [],
		});

		expect(report.items).toHaveLength(1);
	});
});
