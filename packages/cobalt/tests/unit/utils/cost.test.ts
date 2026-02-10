import { describe, expect, it } from 'vitest';
import { estimateCost } from '../../../src/utils/cost.js';

describe('estimateCost', () => {
	describe('OpenAI models', () => {
		it('should estimate cost for GPT-4o', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'gpt-4o');

			// $2.50 per 1M input, $10.00 per 1M output
			// (10000 / 1000000) * 2.50 + (5000 / 1000000) * 10.00 = 0.025 + 0.05 = 0.075
			expect(cost).toBeCloseTo(0.075, 3);
		});

		it('should estimate cost for GPT-4o-mini', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'gpt-4o-mini');

			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeLessThan(0.01);
		});

		it('should estimate cost for GPT-4', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'gpt-4');

			expect(cost).toBeGreaterThan(0);
		});

		it('should estimate cost for GPT-3.5-turbo', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'gpt-3.5-turbo');

			expect(cost).toBeGreaterThan(0);
		});
	});

	describe('Anthropic models', () => {
		it('should estimate cost for Claude Opus 4.6', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'claude-opus-4-6');

			expect(cost).toBeGreaterThan(0);
		});

		it('should estimate cost for Claude Sonnet 4.5', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'claude-sonnet-4-5-20250929');

			expect(cost).toBeGreaterThan(0);
		});

		it('should estimate cost for Claude Haiku 4.5', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'claude-haiku-4-5-20251001');

			expect(cost).toBeGreaterThan(0);
		});
	});

	describe('edge cases', () => {
		it('should handle zero tokens', () => {
			const cost = estimateCost({ input: 0, output: 0 }, 'gpt-4o');

			expect(cost).toBe(0);
		});

		it('should handle only input tokens', () => {
			const cost = estimateCost({ input: 10000, output: 0 }, 'gpt-4o');

			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeCloseTo(0.025, 3);
		});

		it('should handle only output tokens', () => {
			const cost = estimateCost({ input: 0, output: 5000 }, 'gpt-4o');

			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeCloseTo(0.05, 3);
		});

		it('should handle small token counts', () => {
			const cost = estimateCost({ input: 10, output: 5 }, 'gpt-4o');

			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeLessThan(0.001);
		});

		it('should handle large token counts', () => {
			const cost = estimateCost({ input: 1000000, output: 500000 }, 'gpt-4o');

			expect(cost).toBeGreaterThan(1);
		});

		it('should fall back to default pricing for unknown model', () => {
			const cost = estimateCost({ input: 10000, output: 5000 }, 'unknown-model');

			// Falls back to gpt-4o-mini pricing
			expect(cost).toBeGreaterThan(0);
		});
	});

	describe('cost comparisons', () => {
		it('should show GPT-4o-mini is cheaper than GPT-4o', () => {
			const tokens = { input: 10000, output: 5000 };

			const costGpt4o = estimateCost(tokens, 'gpt-4o');
			const costGpt4oMini = estimateCost(tokens, 'gpt-4o-mini');

			expect(costGpt4oMini).toBeLessThan(costGpt4o);
		});

		it('should scale linearly with token count', () => {
			const tokens1 = { input: 1000, output: 500 };
			const tokens2 = { input: 2000, output: 1000 };

			const cost1 = estimateCost(tokens1, 'gpt-4o');
			const cost2 = estimateCost(tokens2, 'gpt-4o');

			expect(cost2).toBeCloseTo(cost1 * 2, 5);
		});
	});

	describe('realistic usage', () => {
		it('should estimate cost for typical experiment', () => {
			const totalTokens = { input: 100 * 100, output: 100 * 50 };
			const cost = estimateCost(totalTokens, 'gpt-4o-mini');

			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeLessThan(1);
		});

		it('should estimate cost for large evaluation', () => {
			const totalTokens = { input: 1000 * 500, output: 1000 * 200 };
			const cost = estimateCost(totalTokens, 'gpt-4o');

			expect(cost).toBeGreaterThan(0);
			expect(cost).toBeLessThan(10);
		});
	});
});
