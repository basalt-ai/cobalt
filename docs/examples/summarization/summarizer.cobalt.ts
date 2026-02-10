import { Dataset, Evaluator, experiment } from 'cobalt';
import { summarize } from './summarizer.js';

// Load dataset from JSONL file (one JSON object per line)
const dataset = Dataset.fromJSONL('./articles.jsonl');

// Define evaluators
const evaluators = [
	// Evaluator 1: Faithfulness - Are facts accurate?
	new Evaluator({
		name: 'faithfulness',
		type: 'llm-judge',
		prompt: `You are evaluating a summary for faithfulness to the source.

Original Article:
{{input.content}}

Summary:
{{output}}

Rate faithfulness from 0.0 to 1.0:
- 1.0 = Completely faithful, all facts accurate, no hallucinations
- 0.7-0.9 = Mostly faithful, minor omissions acceptable
- 0.4-0.6 = Some inaccuracies or misleading statements
- 0.0-0.3 = Major hallucinations or fabricated information

Check for:
- Factual accuracy (no made-up details)
- No contradictions with source
- No unsupported claims

Respond with JSON:
{
  "score": <number between 0 and 1>,
  "reason": "<explanation focusing on accuracy>"
}`,
		model: 'gpt-4o-mini',
		provider: 'openai',
	}),

	// Evaluator 2: Conciseness - Is length appropriate?
	new Evaluator({
		name: 'conciseness',
		type: 'function',
		fn: ({ output }) => {
			const wordCount = String(output).split(/\s+/).length;
			const targetMin = 75;
			const targetMax = 125;

			let score = 1.0;
			let reason = `${wordCount} words (target: ${targetMin}-${targetMax})`;

			if (wordCount < targetMin) {
				// Too short
				score = Math.max(0, wordCount / targetMin);
				reason += ' - too short';
			} else if (wordCount > targetMax) {
				// Too long
				score = Math.max(0, 1 - (wordCount - targetMax) / 100);
				reason += ' - too long';
			} else {
				reason += ' - perfect length';
			}

			return { score, reason };
		},
	}),

	// Evaluator 3: Clarity - Is it readable?
	new Evaluator({
		name: 'clarity',
		type: 'llm-judge',
		prompt: `You are evaluating a summary for clarity and readability.

Summary:
{{output}}

Rate clarity from 0.0 to 1.0:
- 1.0 = Exceptionally clear, well-structured, easy to understand
- 0.7-0.9 = Clear and readable
- 0.4-0.6 = Somewhat unclear or confusing
- 0.0-0.3 = Difficult to understand

Check for:
- Clear sentence structure
- Logical flow of ideas
- Proper grammar
- No ambiguous statements

Respond with JSON:
{
  "score": <number between 0 and 1>,
  "reason": "<explanation focusing on clarity>"
}`,
		model: 'gpt-4o-mini',
		provider: 'openai',
	}),
];

// Run the experiment
experiment(
	'summarizer-test',
	dataset,
	async ({ item }) => {
		// Summarize the article
		const response = await summarize(item.title, item.content, 100);

		// Return summary and metadata
		return {
			output: response.summary,
			metadata: {
				model: response.model,
				tokens: response.tokens,
				duration: response.duration,
				articleLength: item.content.split(/\s+/).length,
				summaryLength: response.summary.split(/\s+/).length,
			},
		};
	},
	{
		evaluators,
		concurrency: 2, // Limit concurrency for longer requests
		timeout: 45000, // 45 second timeout
		tags: ['summarization', 'gpt-4o-mini', 'example'],
	},
);
