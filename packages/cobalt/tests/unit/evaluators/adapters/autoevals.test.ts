import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutoevalsEvaluatorConfig, EvalContext } from '../../../../src/types/index.js';

// Mock the autoevals package
vi.mock('autoevals', () => ({
	Levenshtein: vi.fn().mockResolvedValue({ score: 0.85, metadata: { rationale: 'Close match' } }),
	Factuality: vi
		.fn()
		.mockResolvedValue({ score: 0.9, metadata: { rationale: 'Factually accurate' } }),
	ClosedQA: vi.fn().mockResolvedValue({ score: 0.7, metadata: { rationale: 'Partially correct' } }),
	// Simulate evaluator returning percentage (>1)
	Humor: vi.fn().mockResolvedValue({ score: 75, metadata: { rationale: 'Funny' } }),
}));

// Must import after mock setup so the registry.register side effect uses the mocked autoevals
import { evaluateAutoevals } from '../../../../src/evaluators/adapters/autoevals.js';

const baseContext: EvalContext = {
	item: { input: 'What is the capital of France?', expectedOutput: 'Paris' },
	output: 'Paris is the capital of France',
	metadata: {},
};

describe('evaluateAutoevals', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('evaluator dispatch', () => {
		it('should call the correct evaluator by type', async () => {
			const Autoevals = await import('autoevals');

			const config: AutoevalsEvaluatorConfig = {
				name: 'levenshtein',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(Autoevals.Levenshtein).toHaveBeenCalled();
			expect(result.score).toBe(0.85);
			expect(result.reason).toBe('Close match');
		});

		it('should return score 0 for unknown evaluator type', async () => {
			const config: AutoevalsEvaluatorConfig = {
				name: 'unknown',
				type: 'autoevals',
				evaluatorType: 'NonExistent' as any,
			};

			const result = await evaluateAutoevals(config, baseContext);

			// The error is caught and returns score 0 regardless of error message
			expect(result.score).toBe(0);
			expect(result.reason).toContain('Autoevals error');
		});
	});

	describe('score normalization', () => {
		it('should pass through scores in 0-1 range', async () => {
			const config: AutoevalsEvaluatorConfig = {
				name: 'factuality',
				type: 'autoevals',
				evaluatorType: 'Factuality',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.score).toBe(0.9);
		});

		it('should convert scores >1 to 0-1 range (percentage conversion)', async () => {
			const config: AutoevalsEvaluatorConfig = {
				name: 'humor',
				type: 'autoevals',
				evaluatorType: 'Humor',
			};

			const result = await evaluateAutoevals(config, baseContext);

			// 75 > 1, so should be converted: 75 / 100 = 0.75
			expect(result.score).toBe(0.75);
		});

		it('should clamp negative scores to 0', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockResolvedValueOnce({
				score: -0.5,
				metadata: {},
			} as any);

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.score).toBe(0);
		});

		it('should clamp scores above 1 after normalization', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockResolvedValueOnce({
				score: 150,
				metadata: {},
			} as any);

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			// 150 / 100 = 1.5, clamped to 1
			expect(result.score).toBe(1);
		});

		it('should handle undefined score as 0', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockResolvedValueOnce({
				metadata: {},
			} as any);

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.score).toBe(0);
		});
	});

	describe('context and argument building', () => {
		it('should pass expected field to evaluators that need it', async () => {
			const Autoevals = await import('autoevals');

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			await evaluateAutoevals(config, baseContext);

			expect(Autoevals.Levenshtein).toHaveBeenCalledWith(
				expect.objectContaining({
					output: 'Paris is the capital of France',
					expected: 'Paris',
				}),
			);
		});

		it('should use custom expectedField', async () => {
			const Autoevals = await import('autoevals');

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
				expectedField: 'answer',
			};

			const context: EvalContext = {
				item: { input: 'test', answer: 'expected answer' },
				output: 'some output',
				metadata: {},
			};

			await evaluateAutoevals(config, context);

			expect(Autoevals.Levenshtein).toHaveBeenCalledWith(
				expect.objectContaining({ expected: 'expected answer' }),
			);
		});

		it('should add input for question-based evaluators', async () => {
			const Autoevals = await import('autoevals');

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'ClosedQA',
			};

			await evaluateAutoevals(config, baseContext);

			expect(Autoevals.ClosedQA).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'What is the capital of France?',
				}),
			);
		});

		it('should stringify non-string output', async () => {
			const Autoevals = await import('autoevals');

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const context: EvalContext = {
				item: { input: 'test', expectedOutput: 'expected' },
				output: { answer: 'Paris', confidence: 0.9 },
				metadata: {},
			};

			await evaluateAutoevals(config, context);

			expect(Autoevals.Levenshtein).toHaveBeenCalledWith(
				expect.objectContaining({
					output: JSON.stringify({ answer: 'Paris', confidence: 0.9 }),
				}),
			);
		});
	});

	describe('error handling', () => {
		it('should return score 0 on evaluator error', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockRejectedValueOnce(new Error('API timeout'));

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.score).toBe(0);
			expect(result.reason).toContain('Autoevals error');
			expect(result.reason).toContain('API timeout');
		});

		it('should handle non-Error exceptions', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockRejectedValueOnce('string error');

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.score).toBe(0);
			expect(result.reason).toContain('string error');
		});
	});

	describe('reason extraction', () => {
		it('should use rationale from metadata when available', async () => {
			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Factuality',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.reason).toBe('Factually accurate');
		});

		it('should use error field when no rationale', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockResolvedValueOnce({
				score: 0.5,
				error: 'Partial match',
				metadata: {},
			} as any);

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.reason).toBe('Partial match');
		});

		it('should use default reason when no rationale or error', async () => {
			const Autoevals = await import('autoevals');
			vi.mocked(Autoevals.Levenshtein).mockResolvedValueOnce({
				score: 0.5,
				metadata: {},
			} as any);

			const config: AutoevalsEvaluatorConfig = {
				name: 'test',
				type: 'autoevals',
				evaluatorType: 'Levenshtein',
			};

			const result = await evaluateAutoevals(config, baseContext);

			expect(result.reason).toContain('Autoevals Levenshtein score: 0.500');
		});
	});
});
