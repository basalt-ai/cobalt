import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Evaluator } from '../../src/core/Evaluator.js';
import { registry } from '../../src/core/EvaluatorRegistry.js';
import { sampleEvalContext } from '../helpers/fixtures.js';

// Mock evaluator handlers
const mockLLMJudge = vi.fn().mockResolvedValue({ score: 0.85, reason: 'LLM judge result' });
const mockFunction = vi.fn().mockResolvedValue({ score: 1, reason: 'Function result' });
const mockSimilarity = vi
	.fn()
	.mockRejectedValue(new Error('OpenAI API key is required for similarity evaluator'));

describe('Evaluator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Register mock handlers in the registry
		registry.register('llm-judge', mockLLMJudge);
		registry.register('function', mockFunction);
		registry.register('similarity', mockSimilarity);
	});

	afterEach(() => {
		registry.unregister('llm-judge');
		registry.unregister('function');
		registry.unregister('similarity');
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
	});

	describe('evaluate', () => {
		it('should dispatch to llm-judge evaluator via registry', async () => {
			const evaluator = new Evaluator({
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-5-mini',
			});

			const result = await evaluator.evaluate(sampleEvalContext, 'fake-api-key');

			expect(mockLLMJudge).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'relevance', type: 'llm-judge' }),
				sampleEvalContext,
				'fake-api-key',
				undefined,
			);
			expect(result.score).toBe(0.85);
		});

		it('should dispatch to function evaluator via registry', async () => {
			const evaluator = new Evaluator({
				name: 'custom',
				type: 'function',
				fn: ({ output }) => ({ score: output ? 1 : 0 }),
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			expect(mockFunction).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'custom', type: 'function' }),
				sampleEvalContext,
				undefined,
				undefined,
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

			expect(result.score).toBe(0);
			expect(result.reason).toContain('OpenAI API key is required');
		});

		it('should return error result for unknown evaluator type', async () => {
			const evaluator = new Evaluator({
				name: 'test',
				type: 'unknown' as never,
			});

			const result = await evaluator.evaluate(sampleEvalContext);

			expect(result.score).toBe(0);
			expect(result.reason).toContain('Unknown evaluator type');
		});

		it('should handle errors and return score 0 with error message', async () => {
			mockFunction.mockRejectedValueOnce(new Error('Evaluation failed'));

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
			mockFunction.mockRejectedValueOnce('String error');

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
			];

			expect(evaluators).toHaveLength(2);
			expect(evaluators[0].type).toBe('llm-judge');
			expect(evaluators[1].type).toBe('function');
		});
	});

	describe('type coercion', () => {
		it('should handle config without explicit type property', () => {
			const evaluator = new Evaluator({
				name: 'test',
				prompt: 'Rate from 0 to 1',
			} as never);

			expect(evaluator.type).toBe('llm-judge');
		});
	});

	describe('edge cases', () => {
		it('should handle empty context', async () => {
			mockFunction.mockResolvedValueOnce({ score: 0.5, reason: 'ok' });

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
	});
});
