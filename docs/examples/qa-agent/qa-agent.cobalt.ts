import { Dataset, Evaluator, experiment } from '@basalt-ai/cobalt';
import { answerQuestion } from './agent.js';

// Load dataset from JSON file
const dataset = Dataset.fromJSON('./dataset.json');

// Define evaluators
const evaluators = [
	// Evaluator 1: Check if answer contains expected text
	new Evaluator({
		name: 'contains-answer',
		type: 'function',
		fn: ({ item, output }) => {
			const normalizedOutput = String(output).toLowerCase();
			const normalizedExpected = String(item.expectedOutput).toLowerCase();
			const contains = normalizedOutput.includes(normalizedExpected);

			return {
				score: contains ? 1 : 0,
				reason: contains
					? `Output contains expected answer "${item.expectedOutput}"`
					: `Expected "${item.expectedOutput}" not found in output`,
			};
		},
	}),

	// Evaluator 2: Check response length (should be concise)
	new Evaluator({
		name: 'conciseness',
		type: 'function',
		fn: ({ output }) => {
			const wordCount = String(output).split(/\s+/).length;
			const maxWords = 50;
			const score = wordCount <= maxWords ? 1 : Math.max(0, 1 - (wordCount - maxWords) / 50);

			return {
				score,
				reason: `${wordCount} words (target: ≤${maxWords})`,
			};
		},
	}),

	// Evaluator 3: LLM Judge for factual accuracy
	new Evaluator({
		name: 'factual-accuracy',
		type: 'llm-judge',
		prompt: `You are evaluating a Q&A system's response for factual accuracy.

Question: {{input}}
Agent's Answer: {{output}}
Expected Answer: {{expectedOutput}}

Rate the factual accuracy from 0.0 to 1.0:
- 1.0 = Completely accurate and contains the expected information
- 0.7-0.9 = Mostly accurate but may have minor omissions or extra details
- 0.4-0.6 = Partially accurate or missing key information
- 0.0-0.3 = Inaccurate or incorrect

Respond with JSON:
{
  "score": <number between 0 and 1>,
  "reason": "<explanation of your rating>"
}`,
		model: 'gpt-4o-mini',
		provider: 'openai',
	}),
];

// Run the experiment
experiment(
	'qa-agent-test',
	dataset,
	async ({ item }) => {
		// Call our Q&A agent
		const response = await answerQuestion(item.input);

		// Return output and metadata
		return {
			output: response.answer,
			metadata: {
				model: response.model,
				tokens: response.tokens,
				duration: response.duration,
				category: item.category,
			},
		};
	},
	{
		evaluators,
		concurrency: 3, // Run 3 questions at a time
		timeout: 30000, // 30 second timeout per question
		tags: ['qa', 'gpt-4o-mini', 'example'],
	},
);
