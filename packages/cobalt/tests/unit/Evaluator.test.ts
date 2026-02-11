import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Evaluator } from '../../src/core/Evaluator.js';
import { sampleEvalContext } from '../helpers/fixtures.js';

// Mock all evaluator implementations
vi.mock('../../src/evaluators/llm-judge.js', () => ({
	evaluateLLMJudge: vi.fn().mockResolvedValue({ score: 0.85, reason: 'LLM judge result' }),
}));

vi.mock('../../src/evaluators/function.js', () => ({
	evaluateFunction: vi.fn().mockResolvedValue({ score: 1, reason: 'Function result' }),
}));

vi.mock('../../src/evaluators/exact-match.js', () => ({
	evaluateExactMatch: vi.fn().mockReturnValue({ score: 1, reason: 'Exact match' }),
}));

describe('Evaluator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create evaluator with explicit type', () => {
			const evaluator = new Evaluator({
				name: 'test',
				type: 'function',
				fn: () => ({ score: 1 }),
			});

			expect(evaluator.name).toBe('test');
			expect(evaluator.type).toBe('function');
		});

		it('should default to llm-judge type when not specified', () => {
			const evaluator = new Evaluator({
				name: 'test',
				prompt: 'Rate this',
			});

			expect(evaluator.type).toBe('llm-judge');
		});

		it('should expose evaluator name', () => {
			const evaluator = new Evaluator({
				name: 'relevance',
				type: 'function',
				fn: () => ({ score: 1 }),
			});

			expect(evaluator.name).toBe('relevance');
		});

		it('should expose evaluator type', () => {
			const evaluator = new Evaluator({
				name: 'test',
				type: 'exact-match',
				field: 'expectedOutput',
			});

			expect(evaluator.type).toBe('exact-match');
		});
	});

	describe('evaluate', () => {
		it('should dispatch to llm-judge evaluator', async () => {
			const { evaluateLLMJudge } = await import('../../src/evaluators/llm-judge.js');

			const evaluator = new Evaluator({
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
			});

			const result = await evaluator.evaluate(sampleEvalContext, 'fake-api-key');

			expect(evaluateLLMJudge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'relevance', type: 'llm-judge' }),
				sampleEvalContext,
				'fake-api-key',
				undefined,
			);
			expect(result.score).toBe(0.85);
		});

		it('should dispatch to function evaluator', async () => {
			const { evaluateFunction } = await import('../../src/evaluators/function.js');

			const evaluator = new Evaluator({
				name: 'custom',
				type: 'function',
				fn: ({ output }) => ({ score: output ? 1 : 0 }),
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			expect(evaluateFunction).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom', type: 'function' }),
				sampleEvalContext,
			);
			expect(result.score).toBe(1);
		});

		it('should dispatch to exact-match evaluator', async () => {
			const { evaluateExactMatch } = await import('../../src/evaluators/exact-match.js');

			const evaluator = new Evaluator({
				name: 'exact',
				type: 'exact-match',
				field: 'expectedOutput',
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			expect(evaluateExactMatch).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'exact', type: 'exact-match' }),
				sampleEvalContext,
			);
			expect(result.score).toBe(1);
		});

		it('should return error result for similarity evaluator without API key', async () => {
			const evaluator = new Evaluator({
				name: 'semantic',
				type: 'similarity',
				field: 'expectedOutput',
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			// Errors are caught and returned as score: 0
			expect(result.score).toBe(0);
			expect(result.reason).toContain('OpenAI API key is required');
		});

		it('should return error result for unknown evaluator type', async () => {
			const evaluator = new Evaluator({
				name: 'test',
				type: 'unknown' as any,
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			// Errors are caught and returned as score: 0
			expect(result.score).toBe(0);
			expect(result.reason).toContain('Unknown evaluator type');
		});

		it('should pass optional model parameter to llm-judge', async () => {
			const { evaluateLLMJudge } = await import('../../src/evaluators/llm-judge.js');

			const evaluator = new Evaluator({
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Rate this',
			});

			await evaluator.evaluate(sampleEvalContext, 'fake-api-key', 'gpt-4o');

			expect(evaluateLLMJudge).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				'fake-api-key',
				'gpt-4o',
			);
		});

		it('should handle errors and return score 0 with error message', async () => {
			const { evaluateFunction } = await import('../../src/evaluators/function.js');
			vi.mocked(evaluateFunction).mockRejectedValue(new Error('Evaluation failed'));

			const evaluator = new Evaluator({
				name: 'failing',
				type: 'function',
				fn: () => ({ score: 1 }),
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			expect(result.score).toBe(0);
			expect(result.reason).toContain('Evaluation error');
			expect(result.reason).toContain('Evaluation failed');
		});

		it('should handle non-Error exceptions', async () => {
			const { evaluateFunction } = await import('../../src/evaluators/function.js');
			vi.mocked(evaluateFunction).mockRejectedValue('String error');

			const evaluator = new Evaluator({
				name: 'failing',
				type: 'function',
				fn: () => ({ score: 1 }),
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			expect(result.score).toBe(0);
			expect(result.reason).toContain('Evaluation error');
		});
	});

	describe('multiple evaluators', () => {
		it('should support creating multiple evaluators of different types', () => {
			const evaluators = [
				new Evaluator({
					name: 'llm',
					type: 'llm-judge',
					prompt: 'Rate this',
				}),
				new Evaluator({
					name: 'function',
					type: 'function',
					fn: () => ({ score: 1 }),
				}),
				new Evaluator({
					name: 'exact',
					type: 'exact-match',
					field: 'expectedOutput',
				}),
			];

			expect(evaluators).toHaveLength(3);
			expect(evaluators[0].type).toBe('llm-judge');
			expect(evaluators[1].type).toBe('function');
			expect(evaluators[2].type).toBe('exact-match');
		});

		it('should evaluate independently', async () => {
			// Need to use actual implementations since mocks are at module level
			const evaluators = [
				new Evaluator({
					name: 'eval1',
					type: 'exact-match',
					field: 'expectedOutput',
				}),
				new Evaluator({
					name: 'eval2',
					type: 'exact-match',
					field: 'expectedOutput',
				}),
			];

			const results = await Promise.all(evaluators.map((e) => e.evaluate(sampleEvalContext)));

			expect(results).toHaveLength(2);
			// Both should return the same result from exact-match evaluator
			expect(results[0].score).toBe(1);
			expect(results[1].score).toBe(1);
		});
	});

	describe('type coercion', () => {
		it('should handle config without explicit type property', () => {
			const evaluator = new Evaluator({
				name: 'test',
				prompt: 'Rate from 0 to 1',
				// No type specified
			} as any);

			expect(evaluator.type).toBe('llm-judge');
		});
	});

	describe('edge cases', () => {
		it('should handle empty context', async () => {
			// Re-set mock since previous tests override it with mockRejectedValue
			const { evaluateFunction } = await import('../../src/evaluators/function.js');
			vi.mocked(evaluateFunction).mockResolvedValue({ score: 0.5, reason: 'Function result' });

			const evaluator = new Evaluator({
				name: 'test',
				type: 'function',
				fn: () => ({ score: 0.5 }),
			});

			const emptyContext = {
				item: {},
				output: '',
			};

			const result = await evaluator.evaluate(emptyContext);

			expect(result).toBeDefined();
			expect(result.score).toBe(0.5);
		});

		it('should handle context with metadata', async () => {
			// Use exact-match evaluator which doesn't depend on metadata
			const evaluator = new Evaluator({
				name: 'test',
				type: 'exact-match',
				field: 'expectedOutput',
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			// Should work regardless of metadata
			expect(result.score).toBe(1);
		});
	});
});
