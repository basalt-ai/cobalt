import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Evaluator } from '../../../src/core/Evaluator.js';
import { Dataset } from '../../../src/datasets/Dataset.js';
import type {
	CobaltConfig,
	ExperimentOptions,
	ExperimentReport,
	ItemResult,
} from '../../../src/types/index.js';

// --- Mocks ---

const mockConfig: CobaltConfig = {
	testDir: './experiments',
	testMatch: ['**/*.cobalt.ts'],
	judge: { model: 'gpt-4o-mini', provider: 'openai', apiKey: 'sk-test' },
	outputDir: '.cobalt',
	concurrency: 5,
	timeout: 30000,
	reporters: ['cli'],
	dashboard: { port: 4000, open: false },
	cache: { enabled: false, ttl: '7d' },
	ciMode: false,
	plugins: [],
};

vi.mock('../../../src/core/config.js', () => ({
	loadConfig: vi.fn().mockResolvedValue({
		testDir: './experiments',
		testMatch: ['**/*.cobalt.ts'],
		judge: { model: 'gpt-4o-mini', provider: 'openai', apiKey: 'sk-test' },
		outputDir: '.cobalt',
		concurrency: 5,
		timeout: 30000,
		reporters: ['cli'],
		dashboard: { port: 4000, open: false },
		cache: { enabled: false, ttl: '7d' },
		ciMode: false,
		plugins: [],
	}),
	getApiKey: vi.fn().mockReturnValue('sk-test-key'),
}));

vi.mock('../../../src/core/plugin-loader.js', () => ({
	loadPlugins: vi.fn().mockResolvedValue(undefined),
}));

const mockReporter = {
	onStart: vi.fn(),
	onProgress: vi.fn(),
	onComplete: vi.fn(),
	onCIStatus: vi.fn(),
};

vi.mock('../../../src/cli/reporters/index.js', () => ({
	createReporters: vi.fn().mockReturnValue([
		{
			onStart: vi.fn(),
			onProgress: vi.fn(),
			onComplete: vi.fn(),
			onCIStatus: vi.fn(),
		},
	]),
}));

const mockItemResults: ItemResult[] = [
	{
		index: 0,
		input: { input: 'q1' },
		output: { output: 'a1' },
		latencyMs: 100,
		evaluations: { relevance: { score: 0.9, reason: 'good' } },
		runs: [
			{
				output: { output: 'a1' },
				latencyMs: 100,
				evaluations: { relevance: { score: 0.9, reason: 'good' } },
			},
		],
	},
	{
		index: 1,
		input: { input: 'q2' },
		output: { output: 'a2' },
		latencyMs: 200,
		evaluations: { relevance: { score: 0.8, reason: 'ok' } },
		runs: [
			{
				output: { output: 'a2' },
				latencyMs: 200,
				evaluations: { relevance: { score: 0.8, reason: 'ok' } },
			},
		],
	},
];

vi.mock('../../../src/core/runner.js', () => ({
	runExperiment: vi.fn().mockResolvedValue([
		{
			index: 0,
			input: { input: 'q1' },
			output: { output: 'a1' },
			latencyMs: 100,
			evaluations: { relevance: { score: 0.9, reason: 'good' } },
			runs: [
				{
					output: { output: 'a1' },
					latencyMs: 100,
					evaluations: { relevance: { score: 0.9, reason: 'good' } },
				},
			],
		},
		{
			index: 1,
			input: { input: 'q2' },
			output: { output: 'a2' },
			latencyMs: 200,
			evaluations: { relevance: { score: 0.8, reason: 'ok' } },
			runs: [
				{
					output: { output: 'a2' },
					latencyMs: 200,
					evaluations: { relevance: { score: 0.8, reason: 'ok' } },
				},
			],
		},
	]),
}));

vi.mock('../../../src/storage/results.js', () => ({
	saveResult: vi.fn().mockResolvedValue('/path/to/result.json'),
}));

vi.mock('../../../src/storage/db.js', () => ({
	HistoryDB: vi.fn().mockImplementation(() => ({
		insertRun: vi.fn(),
		close: vi.fn(),
	})),
}));

vi.mock('../../../src/core/ci.js', () => ({
	validateThresholds: vi.fn().mockReturnValue({
		passed: true,
		violations: [],
		summary: 'All thresholds passed',
	}),
}));

vi.mock('../../../src/utils/stats.js', () => ({
	calculateStats: vi.fn((scores: number[]) => ({
		avg: scores.reduce((a, b) => a + b, 0) / scores.length,
		min: Math.min(...scores),
		max: Math.max(...scores),
		p50: scores[0],
		p95: scores[scores.length - 1],
	})),
}));

import { experiment } from '../../../src/core/experiment.js';

describe('experiment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clean up global callbacks
		(global as any).__cobaltCLIResultCallback = undefined;
		(global as any).__cobaltMCPResultCallback = undefined;
	});

	afterEach(() => {
		(global as any).__cobaltCLIResultCallback = undefined;
		(global as any).__cobaltMCPResultCallback = undefined;
	});

	const dataset = new Dataset({ items: [{ input: 'q1' }, { input: 'q2' }] });
	const runner = vi.fn().mockResolvedValue({ output: 'answer' });
	const baseOptions: ExperimentOptions = {
		evaluators: [{ name: 'relevance', type: 'function', fn: () => ({ score: 0.9 }) }],
	};

	it('should throw on empty dataset', async () => {
		const emptyDataset = new Dataset({ items: [] });

		await expect(experiment('test', emptyDataset, runner, baseOptions)).rejects.toThrow(
			'Dataset is empty',
		);
	});

	it('should load config on start', async () => {
		const { loadConfig } = await import('../../../src/core/config.js');

		await experiment('test', dataset, runner, baseOptions);

		expect(loadConfig).toHaveBeenCalled();
	});

	it('should load plugins when configured', async () => {
		const { loadConfig } = await import('../../../src/core/config.js');
		const { loadPlugins } = await import('../../../src/core/plugin-loader.js');

		vi.mocked(loadConfig).mockResolvedValueOnce({
			...mockConfig,
			plugins: ['./my-plugin.ts'],
		});

		await experiment('test', dataset, runner, baseOptions);

		expect(loadPlugins).toHaveBeenCalledWith(['./my-plugin.ts']);
	});

	it('should skip plugin loading when no plugins', async () => {
		const { loadPlugins } = await import('../../../src/core/plugin-loader.js');

		await experiment('test', dataset, runner, baseOptions);

		expect(loadPlugins).not.toHaveBeenCalled();
	});

	it('should create Evaluator instances from configs', async () => {
		const { runExperiment } = await import('../../../src/core/runner.js');

		await experiment('test', dataset, runner, baseOptions);

		expect(runExperiment).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Function),
			expect.objectContaining({
				evaluators: expect.arrayContaining([expect.any(Evaluator)]),
			}),
		);
	});

	it('should pass existing Evaluator instances through', async () => {
		const { runExperiment } = await import('../../../src/core/runner.js');
		const evaluator = new Evaluator({
			name: 'custom',
			type: 'function',
			fn: () => ({ score: 1 }),
		});

		await experiment('test', dataset, runner, { evaluators: [evaluator] });

		expect(runExperiment).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Function),
			expect.objectContaining({
				evaluators: [evaluator],
			}),
		);
	});

	it('should get API key for llm-judge evaluators', async () => {
		const { getApiKey } = await import('../../../src/core/config.js');

		await experiment('test', dataset, runner, {
			evaluators: [{ name: 'judge', type: 'llm-judge', prompt: 'Rate this' }],
		});

		expect(getApiKey).toHaveBeenCalled();
	});

	it('should skip API key for function-only evaluators', async () => {
		const { getApiKey } = await import('../../../src/core/config.js');

		await experiment('test', dataset, runner, {
			evaluators: [{ name: 'fn', type: 'function', fn: () => ({ score: 1 }) }],
		});

		expect(getApiKey).not.toHaveBeenCalled();
	});

	it('should call runExperiment with merged options', async () => {
		const { runExperiment } = await import('../../../src/core/runner.js');

		await experiment('test', dataset, runner, {
			...baseOptions,
			concurrency: 10,
			timeout: 60000,
			runs: 3,
		});

		expect(runExperiment).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Function),
			expect.objectContaining({
				concurrency: 10,
				timeout: 60000,
				runs: 3,
			}),
		);
	});

	it('should use config defaults for missing options', async () => {
		const { runExperiment } = await import('../../../src/core/runner.js');

		await experiment('test', dataset, runner, baseOptions);

		expect(runExperiment).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Function),
			expect.objectContaining({
				concurrency: 5,
				timeout: 30000,
			}),
		);
	});

	it('should return a complete ExperimentReport', async () => {
		const report = await experiment('my-experiment', dataset, runner, {
			...baseOptions,
			tags: ['v1'],
		});

		expect(report.name).toBe('my-experiment');
		expect(report.tags).toEqual(['v1']);
		expect(report.id).toMatch(/^[0-9a-f]{12}$/);
		expect(report.timestamp).toBeDefined();
		expect(report.config).toBeDefined();
		expect(report.summary).toBeDefined();
		expect(report.items).toBeDefined();
	});

	it('should use options.name to override experiment name', async () => {
		const report = await experiment('original', dataset, runner, {
			...baseOptions,
			name: 'overridden',
		});

		expect(report.name).toBe('overridden');
	});

	it('should save result to JSON file', async () => {
		const { saveResult } = await import('../../../src/storage/results.js');

		await experiment('test', dataset, runner, baseOptions);

		expect(saveResult).toHaveBeenCalledWith(expect.any(Object));
	});

	it('should validate CI thresholds when provided', async () => {
		const { validateThresholds } = await import('../../../src/core/ci.js');

		const report = await experiment('test', dataset, runner, {
			...baseOptions,
			thresholds: { relevance: { avg: 0.8 } },
		});

		expect(validateThresholds).toHaveBeenCalledWith(expect.any(Object), {
			relevance: { avg: 0.8 },
		});
		expect(report.ciStatus).toBeDefined();
	});

	it('should skip CI validation when no thresholds', async () => {
		const { validateThresholds } = await import('../../../src/core/ci.js');

		const report = await experiment('test', dataset, runner, baseOptions);

		expect(validateThresholds).not.toHaveBeenCalled();
		expect(report.ciStatus).toBeUndefined();
	});

	it('should insert into HistoryDB silently', async () => {
		const { HistoryDB } = await import('../../../src/storage/db.js');

		await experiment('test', dataset, runner, baseOptions);

		expect(HistoryDB).toHaveBeenCalled();
	});

	it('should survive HistoryDB errors', async () => {
		const { HistoryDB } = await import('../../../src/storage/db.js');
		vi.mocked(HistoryDB).mockImplementationOnce(() => {
			throw new Error('DB locked');
		});

		// Should not throw
		const report = await experiment('test', dataset, runner, baseOptions);

		expect(report).toBeDefined();
	});

	it('should invoke global CLI callback if present', async () => {
		const callback = vi.fn();
		(global as any).__cobaltCLIResultCallback = callback;

		await experiment('test', dataset, runner, baseOptions);

		expect(callback).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
	});

	it('should invoke global MCP callback if present', async () => {
		const callback = vi.fn();
		(global as any).__cobaltMCPResultCallback = callback;

		await experiment('test', dataset, runner, baseOptions);

		expect(callback).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
	});

	it('should not fail when no global callbacks present', async () => {
		const report = await experiment('test', dataset, runner, baseOptions);

		expect(report).toBeDefined();
	});

	it('should calculate summary scores from results', async () => {
		const report = await experiment('test', dataset, runner, baseOptions);

		expect(report.summary.scores).toBeDefined();
		expect(report.summary.scores.relevance).toBeDefined();
		expect(report.summary.scores.relevance.avg).toBeCloseTo(0.85, 1);
	});

	it('should calculate total duration', async () => {
		const report = await experiment('test', dataset, runner, baseOptions);

		expect(report.summary.totalDurationMs).toBeGreaterThanOrEqual(0);
		expect(report.summary.totalItems).toBe(2);
	});

	it('should include evaluator names in report config', async () => {
		const report = await experiment('test', dataset, runner, baseOptions);

		expect(report.config.evaluators).toEqual(['relevance']);
	});
});
