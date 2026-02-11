import { describe, expect, it } from 'vitest';
import { evaluateExactMatch } from '../../../src/evaluators/exact-match.js';
import type { ExactMatchEvaluatorConfig } from '../../../src/types/index.js';
import { sampleEvalContext } from '../../helpers/fixtures.js';

describe('evaluateExactMatch', () => {
	it('should return score 1 for exact match', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const result = await evaluateExactMatch(config, sampleEvalContext);

		expect(result.score).toBe(1);
		expect(result.reason).toBe('Output matches expected value');
	});

	it('should return score 0 for mismatch', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			...sampleEvalContext,
			output: 'London', // Wrong answer
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(0);
		expect(result.reason).toContain('does not match');
	});

	it('should perform case-sensitive matching by default', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			...sampleEvalContext,
			output: 'paris', // lowercase
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(0);
	});

	it('should support case-insensitive matching via caseSensitive=false', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
			caseSensitive: false,
		};

		const context = {
			...sampleEvalContext,
			output: 'paris', // lowercase
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(1);
	});

	it('should trim whitespace before comparing', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			...sampleEvalContext,
			output: '  Paris  ', // with whitespace
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(1);
	});

	it('should handle missing field gracefully', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'nonExistentField',
		};

		const result = await evaluateExactMatch(config, sampleEvalContext);

		expect(result.score).toBe(0);
		expect(result.reason).toBe('Field "nonExistentField" not found in item');
	});

	it('should handle numeric values', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: 42 },
			output: 42,
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(1);
	});

	it('should handle string vs number comparison', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: 42 },
			output: '42',
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(1); // String coercion should work
	});

	it('should handle boolean values', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: true },
			output: true,
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(1);
	});

	it('should handle empty strings', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: '' },
			output: '',
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.score).toBe(1);
	});

	it('should handle null values', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: null },
			output: null,
		};

		const result = await evaluateExactMatch(config, context);

		// null is treated as "not found"
		expect(result.score).toBe(0);
		expect(result.reason).toBe('Field "expectedOutput" not found in item');
	});

	it('should handle undefined values', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: undefined },
			output: undefined,
		};

		const result = await evaluateExactMatch(config, context);

		// undefined is treated as "not found"
		expect(result.score).toBe(0);
		expect(result.reason).toBe('Field "expectedOutput" not found in item');
	});

	it('should compare objects by string representation', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: { key: 'value' } },
			output: { key: 'value' },
		};

		const result = await evaluateExactMatch(config, context);

		// JSON.stringify({key:'value'}) = '{"key":"value"}' vs String({key:'value'}) = '[object Object]'
		expect(result.score).toBe(0);
	});

	it('should handle arrays', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			item: { expectedOutput: ['a', 'b', 'c'] },
			output: ['a', 'b', 'c'],
		};

		const result = await evaluateExactMatch(config, context);

		// JSON.stringify(['a','b','c']) = '["a","b","c"]' vs String(['a','b','c']) = 'a,b,c'
		expect(result.score).toBe(0);
	});

	it('should provide descriptive reason for match', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const result = await evaluateExactMatch(config, sampleEvalContext);

		expect(result.reason).toBeDefined();
		expect(result.reason.length).toBeGreaterThan(0);
	});

	it('should provide descriptive reason for mismatch', async () => {
		const config: ExactMatchEvaluatorConfig = {
			name: 'exact',
			type: 'exact-match',
			field: 'expectedOutput',
		};

		const context = {
			...sampleEvalContext,
			output: 'Wrong',
		};

		const result = await evaluateExactMatch(config, context);

		expect(result.reason).toBeDefined();
		expect(result.reason).toContain('does not match');
	});
});
