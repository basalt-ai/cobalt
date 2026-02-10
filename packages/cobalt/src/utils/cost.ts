/**
 * Model pricing per 1M tokens (input/output)
 * Prices as of February 2026
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	// OpenAI
	'gpt-4o': { input: 2.5, output: 10.0 },
	'gpt-4o-mini': { input: 0.15, output: 0.6 },
	'gpt-4-turbo': { input: 10.0, output: 30.0 },
	'gpt-4': { input: 30.0, output: 60.0 },
	'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

	// Anthropic
	'claude-opus-4-6': { input: 15.0, output: 75.0 },
	'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
	'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
	'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
	'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },

	// Embeddings
	'text-embedding-3-small': { input: 0.02, output: 0 },
	'text-embedding-3-large': { input: 0.13, output: 0 },
};

export interface TokenUsage {
	input: number;
	output: number;
}

/**
 * Estimate cost for LLM usage
 * @param tokens - Token usage (input and output)
 * @param model - Model identifier
 * @returns Estimated cost in USD
 */
export function estimateCost(tokens: TokenUsage, model: string): number {
	const pricing = MODEL_PRICING[model];

	if (!pricing) {
		console.warn(`Unknown model pricing for: ${model}, using gpt-4o-mini pricing`);
		const fallback = MODEL_PRICING['gpt-4o-mini'];
		return (
			(tokens.input / 1_000_000) * fallback.input + (tokens.output / 1_000_000) * fallback.output
		);
	}

	return (tokens.input / 1_000_000) * pricing.input + (tokens.output / 1_000_000) * pricing.output;
}

/**
 * Format cost as USD string
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.03")
 */
export function formatCost(cost: number): string {
	if (cost < 0.01) {
		return '<$0.01';
	}
	return `$${cost.toFixed(2)}`;
}
