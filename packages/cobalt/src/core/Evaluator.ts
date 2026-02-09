import type {
  EvaluatorConfig,
  EvalContext,
  EvalResult,
  LLMJudgeEvaluatorConfig,
  FunctionEvaluatorConfig,
  ExactMatchEvaluatorConfig,
  SimilarityEvaluatorConfig
} from '../types/index.js'

import { registry } from './EvaluatorRegistry.js'
import { evaluateLLMJudge } from '../evaluators/llm-judge.js'
import { evaluateFunction } from '../evaluators/function.js'
import { evaluateExactMatch } from '../evaluators/exact-match.js'
import { evaluateSimilarity } from '../evaluators/similarity.js'

/**
 * Evaluator class for scoring agent outputs
 * Supports multiple evaluation strategies (LLM judge, function, similarity, exact-match)
 */
export class Evaluator {
  private config: EvaluatorConfig

  constructor(config: EvaluatorConfig | Omit<EvaluatorConfig, 'type'>) {
    // Default to llm-judge if type not specified
    this.config = {
      type: 'llm-judge',
      ...config
    } as EvaluatorConfig
  }

  /**
   * Evaluate an output
   * @param context - Evaluation context (item, output, metadata)
   * @param apiKey - API key for LLM providers (required for llm-judge)
   * @param model - Model to use (optional, uses config default)
   * @returns Evaluation result with score and reason
   */
  async evaluate(
    context: EvalContext,
    apiKey?: string,
    model?: string
  ): Promise<EvalResult> {
    try {
      // Try registry first (supports custom plugins)
      if (registry.has(this.config.type)) {
        const handler = registry.get(this.config.type)!
        return await handler(this.config, context, apiKey)
      }

      // Fallback to built-in evaluators (backward compatibility)
      // This switch statement will be deprecated in v1.0 and removed in v2.0
      switch (this.config.type) {
        case 'llm-judge':
          return await evaluateLLMJudge(
            this.config as LLMJudgeEvaluatorConfig,
            context,
            apiKey!,
            model
          )

        case 'function':
          return await evaluateFunction(
            this.config as FunctionEvaluatorConfig,
            context
          )

        case 'exact-match':
          return evaluateExactMatch(
            this.config as ExactMatchEvaluatorConfig,
            context
          )

        case 'similarity':
          return await evaluateSimilarity(
            this.config as SimilarityEvaluatorConfig,
            context,
            apiKey
          )

        default:
          throw new Error(`Unknown evaluator type: ${(this.config as any).type}`)
      }
    } catch (error) {
      console.error(`Evaluator "${this.config.name}" failed:`, error)
      return {
        score: 0,
        reason: `Evaluation error: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * Get evaluator name
   */
  get name(): string {
    return this.config.name
  }

  /**
   * Get evaluator type
   */
  get type(): string {
    return this.config.type || 'llm-judge'
  }
}
