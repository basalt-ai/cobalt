import type { EvalContext, EvalResult, EvaluatorConfig } from '../types/index.js';

import { registry } from './EvaluatorRegistry.js';

/**
 * Evaluator class for scoring agent outputs
 * Supports multiple evaluation strategies via the registry
 */
export class Evaluator {
	private config: EvaluatorConfig;

	constructor(config: EvaluatorConfig | Omit<EvaluatorConfig, 'type'>) {
		// Default to llm-judge if type not specified
		this.config = {
			type: 'llm-judge',
			...config,
		} as EvaluatorConfig;
	}

	/**
	 * Evaluate an output
	 * @param context - Evaluation context (item, output, metadata)
	 * @param apiKey - API key for LLM providers (required for llm-judge)
	 * @param model - Model to use (optional, uses config default)
	 * @returns Evaluation result with score and reason
	 */
	async evaluate(context: EvalContext, apiKey?: string, _model?: string): Promise<EvalResult> {
		try {
			if (!registry.has(this.config.type)) {
				throw new Error(`Unknown evaluator type: ${this.config.type}`);
			}

			const handler = registry.get(this.config.type)!;
			return await handler(this.config, context, apiKey);
		} catch (error) {
			console.error(`Evaluator "${this.config.name}" failed:`, error);
			return {
				score: 0,
				reason: `Evaluation error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Get evaluator name
	 */
	get name(): string {
		return this.config.name;
	}

	/**
	 * Get evaluator type
	 */
	get type(): string {
		return this.config.type || 'llm-judge';
	}
}
