import { registry } from '../core/EvaluatorRegistry.js';
import type { EvalContext, EvalResult, ExactMatchEvaluatorConfig } from '../types/index.js';

/**
 * Evaluate using exact string match
 * @param config - Exact match evaluator configuration
 * @param context - Evaluation context
 * @returns Evaluation result
 */
export async function evaluateExactMatch(
	config: ExactMatchEvaluatorConfig,
	context: EvalContext,
): Promise<EvalResult> {
	const expected = context.item[config.field];
	const actual =
		typeof context.output === 'string' ? context.output : JSON.stringify(context.output);

	if (expected === undefined || expected === null) {
		return {
			score: 0,
			reason: `Field "${config.field}" not found in item`,
		};
	}

	const caseSensitive = config.caseSensitive !== false; // Default to true

	const expectedStr = String(expected).trim();
	const actualStr = actual.trim();

	const matches = caseSensitive
		? expectedStr === actualStr
		: expectedStr.toLowerCase() === actualStr.toLowerCase();

	return {
		score: matches ? 1 : 0,
		reason: matches
			? 'Output matches expected value'
			: `Output "${actualStr}" does not match expected "${expectedStr}"`,
	};
}

// Register with global registry
registry.register('exact-match', evaluateExactMatch);
