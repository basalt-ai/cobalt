import { Dataset, Evaluator, experiment } from 'cobalt';

// Define evaluators
const evaluators = [
	new Evaluator({
		name: 'relevance',
		type: 'llm-judge',
		prompt: `You are evaluating an AI agent's response.

Input: {{input}}
Output: {{output}}
Expected: {{expectedOutput}}

Rate how relevant the output is to the input from 0.0 to 1.0.
Respond with JSON: { "score": <number>, "reason": "<string>" }`,
	}),
	new Evaluator({
		name: 'contains-answer',
		type: 'function',
		fn: ({ item, output }) => {
			const hasAnswer = String(output)
				.toLowerCase()
				.includes(String(item.expectedOutput).toLowerCase());
			return {
				score: hasAnswer ? 1 : 0,
				reason: hasAnswer
					? 'Output contains expected answer'
					: 'Expected answer not found in output',
			};
		},
	}),
];

// Define dataset
const dataset = new Dataset({
	items: [
		{ input: 'What is the capital of France?', expectedOutput: 'Paris' },
		{ input: 'What is 2 + 2?', expectedOutput: '4' },
		{ input: 'Who wrote Romeo and Juliet?', expectedOutput: 'Shakespeare' },
	],
});

// Run experiment
experiment(
	'example-agent',
	dataset,
	async ({ item }) => {
		// This is where you call your AI agent
		// For this example, we'll just echo the expected output
		const output = `The answer is: ${item.expectedOutput}`;

		return {
			output,
			metadata: {
				model: 'example-agent',
				tokens: 50,
			},
		};
	},
	{
		evaluators,
		concurrency: 3,
		timeout: 10_000,
		tags: ['example', 'v1'],
	},
);
