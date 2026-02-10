/**
 * P2 Features Demo - Similarity Evaluator + Multiple Runs
 *
 * This experiment demonstrates:
 * 1. Similarity evaluator with embeddings (semantic comparison)
 * 2. Multiple runs support (handling non-determinism)
 *
 * To run: pnpm cobalt run experiments/p2-demo.cobalt.ts
 *
 * Note: Requires OPENAI_API_KEY environment variable for similarity evaluator
 */

import { Dataset, Evaluator, experiment } from '../src/index.js';

// ============================================================================
// Mock Agent: Paraphrasing Agent with Intentional Variance
// ============================================================================

/**
 * Simulates a paraphrasing agent with some non-determinism
 * In a real scenario, this would be an LLM call
 */
async function paraphraseAgent(input: string, runIndex: number): Promise<string> {
	const paraphrases: Record<string, string[]> = {
		'The cat sat on the mat': [
			'A feline rested on a rug',
			'The kitty sat on the carpet',
			'A cat was sitting on the mat',
			'The feline positioned itself on the mat',
			'A cat settled on the mat',
		],
		'Hello world': [
			'Greetings, world',
			'Hi there, world',
			'Hello, Earth',
			'Hey world',
			'Salutations, world',
		],
		'The quick brown fox jumps over the lazy dog': [
			'A fast brown fox leaps over a sleepy dog',
			'The swift fox jumps over the idle dog',
			'A quick fox hops over a lazy canine',
			'The speedy brown fox vaults over the sluggish dog',
			'A rapid brown fox jumps over a lethargic dog',
		],
	};

	const variations = paraphrases[input];
	if (!variations) {
		return input; // Echo if no variations available
	}

	// Use runIndex to cycle through variations (simulating non-determinism)
	return variations[runIndex % variations.length];
}

// ============================================================================
// Dataset: Paraphrasing Tasks
// ============================================================================

const dataset = new Dataset({
	items: [
		{
			input: 'The cat sat on the mat',
			expectedOutput: 'A feline rested on a rug',
			category: 'simple',
		},
		{
			input: 'Hello world',
			expectedOutput: 'Greetings, world',
			category: 'greeting',
		},
		{
			input: 'The quick brown fox jumps over the lazy dog',
			expectedOutput: 'A fast brown fox leaps over a sleepy dog',
			category: 'complex',
		},
	],
});

// ============================================================================
// Evaluators: Demonstrating Multiple Types
// ============================================================================

const evaluators = [
	// NEW P2 FEATURE: Similarity Evaluator with Embeddings
	new Evaluator({
		name: 'semantic-similarity',
		type: 'similarity',
		field: 'expectedOutput',
		// No threshold = raw similarity score (0-1)
		// With threshold = binary scoring (1 if >= threshold, else 0)
	}),

	// Similarity with Threshold (binary scoring)
	new Evaluator({
		name: 'similarity-threshold',
		type: 'similarity',
		field: 'expectedOutput',
		threshold: 0.85, // Pass/fail at 85% similarity
	}),

	// Traditional evaluators for comparison
	new Evaluator({
		name: 'exact-match',
		type: 'exact-match',
		field: 'expectedOutput',
		caseSensitive: false,
	}),

	new Evaluator({
		name: 'length-ratio',
		type: 'function',
		fn: ({ item, output }) => {
			const inputLen = String(item.input).length;
			const outputLen = String(output).length;
			const ratio = Math.abs(inputLen - outputLen) / inputLen;

			// Penalize if length differs by more than 30%
			const score = ratio < 0.3 ? 1 : Math.max(0, 1 - ratio);

			return {
				score,
				reason: `Length ratio: ${(ratio * 100).toFixed(0)}% difference`,
			};
		},
	}),
];

// ============================================================================
// Run Experiment with Multiple Runs (P2 Feature)
// ============================================================================

console.log('\n🚀 P2 Features Demo: Similarity + Multiple Runs\n');
console.log('This experiment will:');
console.log('  • Run each item 5 times (demonstrating variance)');
console.log('  • Use similarity evaluator for semantic comparison');
console.log('  • Show aggregated statistics (mean, stddev, min, max, p50, p95)');
console.log('  • Compare with exact-match evaluator\n');

experiment(
	'p2-demo-paraphraser',
	dataset,
	async ({ item, index, runIndex }) => {
		// Simulate paraphrasing with variance
		const paraphrase = await paraphraseAgent(item.input, runIndex);

		// Simulate processing time
		await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 50));

		return {
			output: paraphrase,
			metadata: {
				runIndex,
				variation: `v${runIndex + 1}`,
			},
		};
	},
	{
		evaluators,
		// P2 FEATURE: Multiple runs support
		runs: 5, // Run each item 5 times to demonstrate variance
		concurrency: 3,
		timeout: 5000,
	},
)
	.then((report) => {
		console.log('\n✅ Experiment completed!\n');
		console.log('==================================================');
		console.log('P2 Features Demonstrated:');
		console.log('==================================================\n');

		console.log('1️⃣  SIMILARITY EVALUATOR:');
		console.log('   Uses OpenAI embeddings to measure semantic similarity');
		console.log('   Scores range from 0.0 (different) to 1.0 (identical)\n');

		console.log('2️⃣  MULTIPLE RUNS:');
		console.log('   Each item was run 5 times to capture variance');
		console.log('   Statistics calculated: mean, stddev, min, max, p50, p95\n');

		console.log('==================================================');
		console.log('Results Summary:');
		console.log('==================================================\n');

		// Display results for each item
		for (const item of report.items) {
			console.log(`📊 Item ${item.index + 1}: "${item.input.input}"`);
			console.log(`   Runs: ${item.runs.length}`);

			if (item.aggregated) {
				console.log(`   Average latency: ${item.aggregated.avgLatencyMs.toFixed(0)}ms\n`);

				console.log('   Evaluator Results:');
				for (const [name, stats] of Object.entries(item.aggregated.evaluations)) {
					console.log(`     ${name}:`);
					console.log(`       Mean:   ${stats.mean.toFixed(3)}`);
					console.log(
						`       StdDev: ${stats.stddev.toFixed(3)} ${stats.stddev > 0.1 ? '(high variance!)' : '(low variance)'}`,
					);
					console.log(`       Range:  [${stats.min.toFixed(3)}, ${stats.max.toFixed(3)}]`);
					console.log(`       P50:    ${stats.p50.toFixed(3)}`);
					console.log(`       P95:    ${stats.p95.toFixed(3)}`);
				}
				console.log('');
			}

			// Show individual runs
			console.log('   Individual Runs:');
			for (let i = 0; i < Math.min(3, item.runs.length); i++) {
				const run = item.runs[i];
				console.log(`     Run ${i + 1}: "${run.output.output}"`);
				const simScore = run.evaluations['semantic-similarity']?.score;
				if (simScore !== undefined) {
					console.log(`       Similarity: ${simScore.toFixed(3)}`);
				}
			}
			if (item.runs.length > 3) {
				console.log(`     ... and ${item.runs.length - 3} more runs`);
			}
			console.log('');
		}

		console.log('==================================================');
		console.log('Key Observations:');
		console.log('==================================================\n');

		console.log('• Semantic similarity captures meaning despite different words');
		console.log('• Exact-match fails but similarity succeeds (expected behavior)');
		console.log('• Standard deviation shows variance across runs');
		console.log('• Multiple runs reveal consistency (or lack thereof)\n');

		console.log(`📁 Full results saved to: ${report.id}`);
		console.log('📊 View in dashboard: pnpm cobalt serve\n');
	})
	.catch((error) => {
		console.error('\n❌ Experiment failed:', error.message);

		if (error.message.includes('API key')) {
			console.error('\n💡 Tip: Set your OpenAI API key:');
			console.error('   export OPENAI_API_KEY="your-key-here"');
			console.error('   or add it to .env file\n');
		}

		process.exit(1);
	});
