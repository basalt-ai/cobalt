/**
 * LLM Prompt: Generate appropriate evaluators
 * Creates evaluator configurations tailored to the agent type
 */

import type { AgentAnalysis } from './generate-dataset.js'

export function getGenerateEvaluatorsPrompt(analysis: AgentAnalysis): string {
	return `Based on this agent analysis:

${JSON.stringify(analysis, null, 2)}

Suggest appropriate evaluators to test this agent's quality. Choose from:

1. **llm-judge**: LLM-based quality evaluation
   - Use for: subjective quality, coherence, relevance
   - Config: { type: 'llm-judge', criteria: ['relevance', 'coherence', 'accuracy'] }

2. **exact-match**: Exact string matching
   - Use for: deterministic outputs, classification tasks
   - Config: { type: 'exact-match', field: 'expectedOutput', caseSensitive: false }

3. **similarity**: Semantic similarity (embeddings)
   - Use for: paraphrasing, semantic equivalence
   - Config: { type: 'similarity', field: 'expectedOutput', threshold: 0.8 }

4. **function**: Custom evaluation logic
   - Use for: custom metrics, business rules
   - Config: { type: 'function', fn: (output, item) => ({ score, reason }) }

Return a JSON array of evaluator configurations:
[
  {
    "name": "evaluator-name",
    "type": "llm-judge|exact-match|similarity|function",
    "config": { /* type-specific config */ },
    "reasoning": "why this evaluator is appropriate for this agent"
  }
]

Select 2-4 evaluators that best test the agent's quality. Prioritize coverage of key behaviors.`
}
