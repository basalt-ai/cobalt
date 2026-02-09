import type {
	AutoevalsEvaluatorConfig,
	EvalContext,
	EvalResult
} from '../../types/index.js'
import { registry } from '../../core/EvaluatorRegistry.js'

/**
 * Evaluate using Braintrust's Autoevals framework
 * @param config - Autoevals evaluator configuration
 * @param context - Evaluation context
 * @param apiKey - API key (required for some evaluators)
 * @returns Evaluation result
 */
export async function evaluateAutoevals(
	config: AutoevalsEvaluatorConfig,
	context: EvalContext,
	apiKey?: string
): Promise<EvalResult> {
	try {
		// Dynamically import autoevals to avoid bundling if not used
		const Autoevals = await import('autoevals')

		// Get the evaluator by type
		const evaluatorName = config.evaluatorType
		const EvaluatorClass = (Autoevals as any)[evaluatorName]

		if (!EvaluatorClass) {
			throw new Error(
				`Unknown Autoevals evaluator: ${evaluatorName}. Available: Levenshtein, Factuality, ContextRecall, ContextPrecision, AnswerRelevancy, Json, Battle, Humor, Embedding, ClosedQA, Security`
			)
		}

		// Prepare evaluation input
		const input = context.item.input || context.item
		const output =
			typeof context.output === 'string'
				? context.output
				: JSON.stringify(context.output)

		// Get expected output if specified
		const expectedField = config.expectedField || 'expectedOutput'
		const expected = context.item[expectedField]

		// Build evaluator arguments based on type
		let evalArgs: any = {
			output,
			...(config.options || {})
		}

		// Add expected/ground truth for evaluators that need it
		if (
			[
				'Levenshtein',
				'Factuality',
				'ContextRecall',
				'ContextPrecision',
				'AnswerRelevancy',
				'Json'
			].includes(evaluatorName)
		) {
			if (expected !== undefined) {
				evalArgs.expected = expected
			}
		}

		// Add input for question-based evaluators
		if (
			[
				'ContextRecall',
				'ContextPrecision',
				'AnswerRelevancy',
				'ClosedQA'
			].includes(evaluatorName)
		) {
			evalArgs.input = input
		}

		// Call the evaluator
		const result = await EvaluatorClass(evalArgs)

		// Normalize score to 0-1 range
		let score = result.score !== undefined ? result.score : 0

		// Some evaluators return scores in different ranges
		if (score > 1) {
			score = score / 100 // Convert percentage to 0-1
		}

		// Clamp to valid range
		score = Math.max(0, Math.min(1, score))

		return {
			score,
			reason:
				result.metadata?.rationale ||
				result.error ||
				`Autoevals ${evaluatorName} score: ${score.toFixed(3)}`
		}
	} catch (error) {
		return {
			score: 0,
			reason: `Autoevals error: ${error instanceof Error ? error.message : String(error)}`
		}
	}
}

// Register with global registry
registry.register('autoevals', evaluateAutoevals)
