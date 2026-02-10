import { registry } from '../core/EvaluatorRegistry.js';
import type { EvalContext, EvalResult, FunctionEvaluatorConfig } from '../types/index.js';

/**
 * Evaluate using custom function
 * @param config - Function evaluator configuration
 * @param context - Evaluation context
 * @returns Evaluation result
 */
export async function evaluateFunction(
	config: FunctionEvaluatorConfig,
	context: EvalContext,
): Promise<EvalResult> {
	try {
		const result = await config.fn(context);

		// Validate result format
		if (typeof result.score !== 'number' || result.score < 0 || result.score > 1) {
			throw new Error('Function must return score between 0 and 1');
		}

		return {
			score: Math.max(0, Math.min(1, result.score)), // Clamp to [0, 1]
			reason: result.reason || 'No reason provided',
		};
	} catch (error) {
		console.error('Function evaluator error:', error);
		throw new Error(
			`Function evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Register with global registry
registry.register('function', evaluateFunction);
