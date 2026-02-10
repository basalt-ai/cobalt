import OpenAI from 'openai';
import { registry } from '../core/EvaluatorRegistry.js';
import type { EvalContext, EvalResult, SimilarityEvaluatorConfig } from '../types/index.js';

/**
 * Evaluate using semantic similarity (embeddings + cosine similarity)
 * @param config - Similarity evaluator configuration
 * @param context - Evaluation context
 * @param apiKey - OpenAI API key
 * @returns Evaluation result
 */
export async function evaluateSimilarity(
	config: SimilarityEvaluatorConfig,
	context: EvalContext,
	apiKey?: string,
): Promise<EvalResult> {
	if (!apiKey) {
		throw new Error('OpenAI API key is required for similarity evaluator');
	}

	// Extract output and expected value
	const output = String(context.output);
	const expectedValue = context.item[config.field];

	if (expectedValue === undefined) {
		throw new Error(`Field "${config.field}" not found in dataset item`);
	}

	const expected = String(expectedValue);

	// Handle empty text cases
	if (!output.trim() || !expected.trim()) {
		return {
			score: 0,
			reason: 'Cannot calculate similarity for empty text',
		};
	}

	// Get embeddings for both texts
	const model = 'text-embedding-3-small'; // Cost-effective default
	const [outputEmbedding, expectedEmbedding] = await Promise.all([
		getEmbedding(output, apiKey, model),
		getEmbedding(expected, apiKey, model),
	]);

	// Calculate cosine similarity
	const similarity = cosineSimilarity(outputEmbedding, expectedEmbedding);

	// Apply threshold logic if specified
	if (config.threshold !== undefined) {
		const passes = similarity >= config.threshold;
		return {
			score: passes ? 1 : 0,
			reason: passes
				? `Similarity ${similarity.toFixed(3)} meets threshold ${config.threshold}`
				: `Similarity ${similarity.toFixed(3)} below threshold ${config.threshold}`,
		};
	}

	// Return raw similarity score
	return {
		score: similarity,
		reason: `Cosine similarity: ${similarity.toFixed(3)}`,
	};
}

/**
 * Get embedding vector for text using OpenAI API
 */
async function getEmbedding(text: string, apiKey: string, model: string): Promise<number[]> {
	const client = new OpenAI({ apiKey });

	try {
		const response = await client.embeddings.create({
			model,
			input: text,
			encoding_format: 'float',
		});

		const embedding = response.data[0]?.embedding;
		if (!embedding) {
			throw new Error('No embedding returned from OpenAI API');
		}

		return embedding;
	} catch (error) {
		console.error('OpenAI embedding error:', error);
		throw error;
	}
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between 0 and 1 (normalized from [-1, 1])
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
	if (vecA.length !== vecB.length) {
		throw new Error('Vectors must have the same length');
	}

	// Calculate dot product
	let dotProduct = 0;
	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i]! * vecB[i]!;
	}

	// Calculate magnitudes
	let magnitudeA = 0;
	let magnitudeB = 0;
	for (let i = 0; i < vecA.length; i++) {
		magnitudeA += vecA[i]! * vecA[i]!;
		magnitudeB += vecB[i]! * vecB[i]!;
	}
	magnitudeA = Math.sqrt(magnitudeA);
	magnitudeB = Math.sqrt(magnitudeB);

	// Handle zero magnitude case
	if (magnitudeA === 0 || magnitudeB === 0) {
		return 0;
	}

	// Calculate cosine similarity
	const cosineSim = dotProduct / (magnitudeA * magnitudeB);

	// Normalize from [-1, 1] to [0, 1]
	// Cosine similarity is typically in [-1, 1], but for text embeddings
	// it's usually positive, so we clamp to [0, 1]
	return Math.max(0, Math.min(1, cosineSim));
}

// Register with global registry
registry.register('similarity', evaluateSimilarity);
