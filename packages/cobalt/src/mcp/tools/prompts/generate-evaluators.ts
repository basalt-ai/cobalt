/**
 * LLM Prompt: Generate appropriate evaluators
 * Creates evaluator configurations tailored to the agent type
 */

import type { AgentAnalysis } from './generate-dataset.js';

export function getGenerateEvaluatorsPrompt(analysis: AgentAnalysis): string {
	return `Based on this agent analysis:

${JSON.stringify(analysis, null, 2)}

Suggest appropriate evaluators to test this agent's quality. Choose from:

1. **llm-judge**: LLM-based quality evaluation (boolean or scale scoring)
   - Use for: subjective quality, coherence, relevance, accuracy
   - Boolean mode (default): returns pass/fail verdict
   - Scale mode: returns 0-1 score for nuanced evaluation
   - Supports chain of thought reasoning

2. **similarity**: Semantic similarity (embeddings)
   - Use for: paraphrasing, semantic equivalence
   - Config: { type: 'similarity', field: 'expectedOutput', threshold: 0.8 }

3. **function**: Custom evaluation logic
   - Use for: exact matching, custom metrics, business rules, deterministic checks
   - Config: { type: 'function', fn: (context) => ({ score, reason }) }

Return a JSON array of evaluator configurations:
[
  {
    "name": "evaluator-name",
    "type": "llm-judge|similarity|function",
    "config": { /* type-specific config */ },
    "reasoning": "why this evaluator is appropriate for this agent"
  }
]

Select 2-4 evaluators that best test the agent's quality. Prioritize coverage of key behaviors.`;
}
