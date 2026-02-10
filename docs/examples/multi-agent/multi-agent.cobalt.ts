import { experiment, Evaluator, Dataset } from 'cobalt'
import { runWorkflow } from './agents.js'

// Load topics to research
const dataset = Dataset.fromJSON('./topics.json')

const evaluators = [
	// Evaluator 1: Completeness
	new Evaluator({
		name: 'completeness',
		type: 'llm-judge',
		prompt: `Evaluate if the final article comprehensively covers the topic.

Topic: {{input}}

Final Article:
{{output}}

Rate completeness from 0.0 to 1.0:
- 1.0 = Comprehensive coverage of all key aspects
- 0.7 = Good coverage with minor omissions
- 0.4 = Partial coverage
- 0.0 = Minimal or superficial coverage

Respond with JSON: {"score": <number>, "reason": "<explanation>"}`,
		model: 'gpt-4o-mini',
		provider: 'openai'
	}),

	// Evaluator 2: Quality
	new Evaluator({
		name: 'quality',
		type: 'llm-judge',
		prompt: `Evaluate the writing quality of the article.

Article:
{{output}}

Rate quality from 0.0 to 1.0:
- 1.0 = Excellent writing, clear structure, professional
- 0.7 = Good quality with minor issues
- 0.4 = Mediocre quality
- 0.0 = Poor quality

Check for:
- Clear structure and flow
- Proper grammar and style
- Engaging and readable

Respond with JSON: {"score": <number>, "reason": "<explanation>"}`,
		model: 'gpt-4o-mini',
		provider: 'openai'
	}),

	// Evaluator 3: Workflow Consistency
	new Evaluator({
		name: 'consistency',
		type: 'llm-judge',
		prompt: `Evaluate if the multi-agent workflow produced consistent output.

Research Notes:
{{metadata.research}}

Initial Article:
{{metadata.article}}

Final Reviewed Article:
{{output}}

Rate consistency from 0.0 to 1.0:
- 1.0 = Perfect consistency across all stages
- 0.7 = Minor inconsistencies
- 0.4 = Noticeable inconsistencies
- 0.0 = Major contradictions

Check if:
- Article reflects research
- Review improved the article
- No contradictions introduced

Respond with JSON: {"score": <number>, "reason": "<explanation>"}`,
		model: 'gpt-4o-mini',
		provider: 'openai'
	})
]

experiment(
	'multi-agent-test',
	dataset,
	async ({ item }) => {
		// Run the complete workflow
		const result = await runWorkflow(item.topic)

		// Return final output with intermediate results in metadata
		return {
			output: result.reviewed,
			metadata: {
				research: result.research,
				article: result.article,
				tokens: result.tokens
			}
		}
	},
	{
		evaluators,
		concurrency: 1, // Sequential to avoid rate limits
		timeout: 60000, // 60 second timeout (3 agents)
		tags: ['multi-agent', 'workflow', 'example']
	}
)
