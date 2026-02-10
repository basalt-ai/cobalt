import { describe, expect, it } from 'vitest';
import { evaluateFunction } from '../../../src/evaluators/function.js';
import type { FunctionEvaluatorConfig } from '../../../src/types/index.js';
import { sampleEvalContext } from '../../helpers/fixtures.js';

describe('evaluateFunction', () => {
	it('should execute custom function and return result', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'test',
			type: 'function',
			fn: ({ item, output }) => ({
				score: output === item.expectedOutput ? 1 : 0,
				reason: 'Exact match check',
			}),
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result.score).toBe(1);
		expect(result.reason).toBe('Exact match check');
	});

	it('should pass correct context to function', async () => {
		let receivedContext: any;

		const config: FunctionEvaluatorConfig = {
			name: 'test',
			type: 'function',
			fn: (context) => {
				receivedContext = context;
				return { score: 1, reason: 'ok' };
			},
		};

		await evaluateFunction(config, sampleEvalContext);

		expect(receivedContext.item).toEqual(sampleEvalContext.item);
		expect(receivedContext.output).toBe(sampleEvalContext.output);
		expect(receivedContext.metadata).toEqual(sampleEvalContext.metadata);
	});

	it('should support async functions', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'async-test',
			type: 'function',
			fn: async ({ output }) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return {
					score: output.length > 0 ? 1 : 0,
					reason: 'Async check',
				};
			},
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result.score).toBe(1);
		expect(result.reason).toBe('Async check');
	});

	it('should throw error for score outside 0-1 range', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'invalid-score',
			type: 'function',
			fn: () => ({
				score: 1.5,
				reason: 'Invalid score',
			}),
		};

		await expect(evaluateFunction(config, sampleEvalContext)).rejects.toThrow(
			/score between 0 and 1/,
		);
	});

	it('should provide default reason when none given', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'no-reason',
			type: 'function',
			fn: () => ({
				score: 0.75,
			}),
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result.score).toBe(0.75);
		expect(result.reason).toBe('No reason provided');
	});

	it('should handle complex evaluation logic', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'complex',
			type: 'function',
			fn: ({ item, output }) => {
				const expected = String(item.expectedOutput).toLowerCase();
				const actual = String(output).toLowerCase();

				const score = expected === actual ? 1 : 0.5;
				const reason = score === 1 ? 'Exact match' : 'Partial match';

				return { score, reason };
			},
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result.score).toBeGreaterThan(0);
		expect(result.reason).toBeDefined();
	});

	it('should allow access to metadata in function', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'metadata-check',
			type: 'function',
			fn: ({ metadata }) => ({
				score: metadata?.model === 'gpt-4o' ? 1 : 0,
				reason: `Model: ${metadata?.model}`,
			}),
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result.score).toBe(1);
		expect(result.reason).toContain('gpt-4o');
	});

	it('should handle errors in custom function gracefully', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'error-test',
			type: 'function',
			fn: () => {
				throw new Error('Custom function error');
			},
		};

		await expect(evaluateFunction(config, sampleEvalContext)).rejects.toThrow(
			'Custom function error',
		);
	});

	it('should support string output matching', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'string-match',
			type: 'function',
			fn: ({ item, output }) => {
				const contains = String(output).includes(String(item.expectedOutput));
				return {
					score: contains ? 1 : 0,
					reason: contains ? 'Contains expected output' : 'Missing expected output',
				};
			},
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result).toHaveProperty('score');
		expect(result).toHaveProperty('reason');
	});

	it('should support numeric scoring with reasoning', async () => {
		const config: FunctionEvaluatorConfig = {
			name: 'length-check',
			type: 'function',
			fn: ({ output }) => {
				const length = String(output).length;
				const score = Math.min(length / 100, 1);
				return {
					score,
					reason: `Output length: ${length} characters`,
				};
			},
		};

		const result = await evaluateFunction(config, sampleEvalContext);

		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(result.score).toBeLessThanOrEqual(1);
		expect(result.reason).toContain('Output length');
	});
});
