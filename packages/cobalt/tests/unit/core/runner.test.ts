import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runExperiment } from '../../../src/core/runner.js';
import type { ExperimentItem, ExperimentResult, RunnerFunction } from '../../../src/types/index.js';

// Mock calculateRunStats
vi.mock('../../../src/utils/stats.js', () => ({
	calculateRunStats: vi.fn((scores: number[]) => ({
		avg: scores.reduce((a, b) => a + b, 0) / scores.length,
		min: Math.min(...scores),
		max: Math.max(...scores),
		stdDev: 0,
	})),
}));

function createMockRunner(result: ExperimentResult = { output: 'test output' }): RunnerFunction {
	return vi.fn().mockResolvedValue(result);
}

function createMockEvaluator(name: string, score: number) {
	return {
		name,
		type: 'function',
		evaluate: vi.fn().mockResolvedValue({ score, reason: `Score: ${score}` }),
	} as any;
}

const sampleItems: ExperimentItem[] = [
	{ input: 'question 1', expectedOutput: 'answer 1' },
	{ input: 'question 2', expectedOutput: 'answer 2' },
	{ input: 'question 3', expectedOutput: 'answer 3' },
];

describe('runExperiment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('single run (runs=1)', () => {
		it('should return ItemResult for each dataset item', async () => {
			const runner = createMockRunner({ output: 'result' });
			const evaluator = createMockEvaluator('relevance', 0.9);

			const results = await runExperiment(sampleItems, runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
			});

			expect(results).toHaveLength(3);
			expect(results[0].index).toBe(0);
			expect(results[0].input).toBe(sampleItems[0]);
			expect(results[0].output).toEqual({ output: 'result' });
			expect(results[0].runs).toHaveLength(1);
		});

		it('should call runner once per item', async () => {
			const runner = createMockRunner();
			const evaluator = createMockEvaluator('test', 1);

			await runExperiment(sampleItems, runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
			});

			expect(runner).toHaveBeenCalledTimes(3);
			expect(runner).toHaveBeenCalledWith(
				expect.objectContaining({ item: sampleItems[0], index: 0, runIndex: 0 }),
			);
			expect(runner).toHaveBeenCalledWith(
				expect.objectContaining({ item: sampleItems[1], index: 1, runIndex: 0 }),
			);
		});

		it('should invoke evaluators on each output', async () => {
			const runner = createMockRunner({ output: 'Paris' });
			const evaluator = createMockEvaluator('accuracy', 0.95);

			await runExperiment(sampleItems, runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
			});

			expect(evaluator.evaluate).toHaveBeenCalledTimes(3);
			expect(evaluator.evaluate).toHaveBeenCalledWith(
				expect.objectContaining({ output: 'Paris', item: sampleItems[0] }),
				undefined,
				undefined,
			);
		});

		it('should store evaluation scores in results', async () => {
			const runner = createMockRunner({ output: 'test' });
			const eval1 = createMockEvaluator('relevance', 0.9);
			const eval2 = createMockEvaluator('conciseness', 0.8);

			const results = await runExperiment(sampleItems, runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [eval1, eval2],
			});

			expect(results[0].evaluations.relevance).toEqual({ score: 0.9, reason: 'Score: 0.9' });
			expect(results[0].evaluations.conciseness).toEqual({
				score: 0.8,
				reason: 'Score: 0.8',
			});
		});

		it('should call progress callback once per item', async () => {
			const runner = createMockRunner();
			const evaluator = createMockEvaluator('test', 1);
			const onProgress = vi.fn();

			await runExperiment(sampleItems, runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
				onProgress,
			});

			expect(onProgress).toHaveBeenCalledTimes(3);
			// Verify one of the progress calls has correct structure
			expect(onProgress).toHaveBeenCalledWith(
				expect.objectContaining({
					totalItems: 3,
					totalRuns: 1,
					totalExecutions: 3,
				}),
			);
		});

		it('should capture error when runner throws', async () => {
			const runner = vi.fn().mockRejectedValue(new Error('Agent crashed'));
			const evaluator = createMockEvaluator('test', 1);

			const results = await runExperiment([sampleItems[0]], runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
			});

			expect(results[0].error).toBe('Agent crashed');
			expect(results[0].output).toEqual({ output: '', metadata: {} });
			expect(results[0].evaluations).toEqual({});
		});

		it('should capture timeout errors', async () => {
			const slowRunner = vi
				.fn()
				.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));
			const evaluator = createMockEvaluator('test', 1);

			const results = await runExperiment([sampleItems[0]], slowRunner, {
				concurrency: 5,
				timeout: 50,
				evaluators: [evaluator],
			});

			expect(results[0].error).toContain('timed out');
			expect(results[0].evaluations).toEqual({});
		});

		it('should return score 0 when evaluator throws', async () => {
			const runner = createMockRunner({ output: 'test' });
			const failingEvaluator = {
				name: 'broken',
				type: 'function',
				evaluate: vi.fn().mockRejectedValue(new Error('Eval crash')),
			} as any;

			const results = await runExperiment([sampleItems[0]], runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [failingEvaluator],
			});

			expect(results[0].evaluations.broken.score).toBe(0);
			expect(results[0].evaluations.broken.reason).toContain('Evaluation error');
		});

		it('should measure latency', async () => {
			const runner = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(() => resolve({ output: 'done' }), 20)),
				);
			const evaluator = createMockEvaluator('test', 1);

			const results = await runExperiment([sampleItems[0]], runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
			});

			expect(results[0].latencyMs).toBeGreaterThanOrEqual(15);
		});
	});

	describe('multiple runs (runs > 1)', () => {
		it('should run each item multiple times', async () => {
			const runner = createMockRunner({ output: 'test' });
			const evaluator = createMockEvaluator('test', 0.9);

			const results = await runExperiment(sampleItems.slice(0, 1), runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
				runs: 3,
			});

			expect(runner).toHaveBeenCalledTimes(3);
			expect(results[0].runs).toHaveLength(3);
		});

		it('should call progress callback for each run of each item', async () => {
			const runner = createMockRunner({ output: 'test' });
			const evaluator = createMockEvaluator('test', 0.8);
			const onProgress = vi.fn();

			await runExperiment(sampleItems.slice(0, 2), runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
				runs: 3,
				onProgress,
			});

			// 2 items × 3 runs = 6 progress calls
			expect(onProgress).toHaveBeenCalledTimes(6);
			expect(onProgress).toHaveBeenCalledWith(
				expect.objectContaining({
					totalRuns: 3,
					totalExecutions: 6,
				}),
			);
		});

		it('should use first run as representative for flat fields', async () => {
			let callCount = 0;
			const runner = vi.fn().mockImplementation(() => {
				callCount++;
				return Promise.resolve({ output: `result-${callCount}` });
			});
			const evaluator = createMockEvaluator('test', 0.9);

			const results = await runExperiment(sampleItems.slice(0, 1), runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
				runs: 2,
			});

			// Flat output field uses first run
			expect(results[0].output).toEqual({ output: 'result-1' });
		});

		it('should include aggregated statistics', async () => {
			const runner = createMockRunner({ output: 'test' });
			const evaluator = createMockEvaluator('test', 0.85);

			const results = await runExperiment(sampleItems.slice(0, 1), runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
				runs: 3,
			});

			expect(results[0].aggregated).toBeDefined();
			expect(results[0].aggregated!.avgLatencyMs).toBeGreaterThanOrEqual(0);
			expect(results[0].aggregated!.evaluations.test).toBeDefined();
		});

		it('should pass correct runIndex to runner', async () => {
			const runner = createMockRunner({ output: 'test' });
			const evaluator = createMockEvaluator('test', 1);

			await runExperiment(sampleItems.slice(0, 1), runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [evaluator],
				runs: 3,
			});

			expect(runner).toHaveBeenCalledWith(expect.objectContaining({ runIndex: 0 }));
			expect(runner).toHaveBeenCalledWith(expect.objectContaining({ runIndex: 1 }));
			expect(runner).toHaveBeenCalledWith(expect.objectContaining({ runIndex: 2 }));
		});
	});

	describe('no evaluators', () => {
		it('should run without evaluators', async () => {
			const runner = createMockRunner({ output: 'test' });

			const results = await runExperiment(sampleItems.slice(0, 1), runner, {
				concurrency: 5,
				timeout: 5000,
				evaluators: [],
			});

			expect(results[0].evaluations).toEqual({});
			expect(results[0].output).toEqual({ output: 'test' });
		});
	});
});
