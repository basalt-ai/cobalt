import { Dataset, Evaluator, experiment } from '@basalt-ai/cobalt';
import { classifySentiment } from './classifier.js';

// Load dataset from CSV file
const dataset = Dataset.fromCSV('./data.csv');

// Define evaluators
const evaluators = [
	// Evaluator 1: Accuracy - Exact match
	new Evaluator({
		name: 'accuracy',
		type: 'function',
		fn: ({ item, output }) => {
			const predicted = String(output).trim().toUpperCase();
			const expected = String(item.expected_label).trim().toUpperCase();
			const correct = predicted === expected;

			return {
				score: correct ? 1 : 0,
				reason: correct
					? `Correct: ${predicted} == ${expected}`
					: `Incorrect: ${predicted} != ${expected}`,
			};
		},
	}),

	// Evaluator 2: Confidence check
	new Evaluator({
		name: 'confidence-check',
		type: 'function',
		fn: ({ metadata }) => {
			const confidence = metadata?.confidence || 0;
			const threshold = 0.7;

			return {
				score: confidence >= threshold ? 1 : 0,
				reason: `Confidence: ${confidence.toFixed(2)} (threshold: ${threshold})`,
			};
		},
	}),
];

// Run the experiment
experiment(
	'classifier-test',
	dataset,
	async ({ item }) => {
		// Classify the text
		const response = await classifySentiment(item.text);

		// Return classification label and metadata
		return {
			output: response.label,
			metadata: {
				confidence: response.confidence,
				model: response.model,
				tokens: response.tokens,
				duration: response.duration,
			},
		};
	},
	{
		evaluators,
		concurrency: 5,
		timeout: 15000,
		tags: ['classification', 'sentiment', 'example'],
	},
);
