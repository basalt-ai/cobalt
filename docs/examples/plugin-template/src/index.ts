/**
 * Cobalt Evaluator Plugin Template
 *
 * This template shows how to create custom evaluators for Cobalt.
 * Plugins allow you to extend Cobalt with domain-specific evaluation logic.
 *
 * Example use cases:
 * - Domain-specific quality metrics (medical accuracy, legal compliance, etc.)
 * - Custom LLM-based evaluations
 * - Integration with external APIs or services
 * - Specialized scoring algorithms
 */

import type { PluginDefinition } from '@basalt-ai/cobalt';

/**
 * STEP 1: Define your plugin
 *
 * A plugin must export a default object matching the PluginDefinition interface.
 * This object contains metadata about your plugin and the evaluators it provides.
 */
const plugin: PluginDefinition = {
	/**
	 * Plugin name (used for logging)
	 */
	name: 'my-custom-plugin',

	/**
	 * Semantic version
	 */
	version: '1.0.0',

	/**
	 * Array of evaluator functions
	 *
	 * Each evaluator provides:
	 * - type: Unique identifier for this evaluator
	 * - name: Human-readable name
	 * - evaluate: Async function that scores outputs
	 */
	evaluators: [
		/**
		 * Example 1: Simple deterministic evaluator
		 *
		 * This evaluator checks if the output contains specific keywords.
		 * Use for: Simple pattern matching, validation rules
		 */
		{
			type: 'keyword-match',
			name: 'Keyword Matcher',
			evaluate: async (config, context) => {
				// config: Your custom configuration from the experiment file
				// context: { item, output, metadata }
				//   - item: The dataset item being evaluated
				//   - output: The agent's output for this item
				//   - metadata: Optional additional context

				const keywords = config.keywords || [];
				const output = String(context.output).toLowerCase();

				// Count matching keywords
				const matches = keywords.filter((kw: string) => output.includes(kw.toLowerCase()));

				const score = Math.min(1, matches.length / keywords.length);

				return {
					score, // Must be between 0 and 1
					reason: `Matched ${matches.length}/${keywords.length} keywords: ${matches.join(', ')}`,
				};
			},
		},

		/**
		 * Example 2: LLM-based evaluator
		 *
		 * This evaluator uses an LLM to judge output quality.
		 * Use for: Subjective quality metrics, nuanced evaluations
		 */
		{
			type: 'llm-custom-judge',
			name: 'Custom LLM Judge',
			evaluate: async (config, context, apiKey) => {
				// apiKey: Provided from environment/config (optional parameter)

				if (!apiKey) {
					return {
						score: 0,
						reason: 'API key required for LLM evaluation',
					};
				}

				try {
					// Example: Call OpenAI API
					// In real implementation, use OpenAI SDK or your preferred LLM
					const { default: OpenAI } = await import('openai');
					const client = new OpenAI({ apiKey });

					const prompt = `
Evaluate this output on a scale of 0-1 for ${config.criteria || 'quality'}.

Input: ${JSON.stringify(context.item.input)}
Output: ${context.output}

Respond with JSON: { "score": <0-1>, "reasoning": "<explanation>" }
`;

					const response = await client.chat.completions.create({
						model: config.model || 'gpt-5-mini',
						messages: [{ role: 'user', content: prompt }],
						response_format: { type: 'json_object' },
					});

					const result = JSON.parse(response.choices[0].message.content || '{}');

					return {
						score: result.score || 0,
						reason: result.reasoning || 'No reasoning provided',
					};
				} catch (error) {
					return {
						score: 0,
						reason: `LLM evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					};
				}
			},
		},

		/**
		 * Example 3: External API integration
		 *
		 * This evaluator calls an external service for validation.
		 * Use for: Third-party integrations, external validators
		 */
		{
			type: 'external-validator',
			name: 'External Validator',
			evaluate: async (config, context) => {
				try {
					// Example: Call external API
					const response = await fetch(config.apiEndpoint, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							output: context.output,
							input: context.item.input,
						}),
					});

					const data = await response.json();

					return {
						score: data.score || 0,
						reason: data.message || 'External validation complete',
					};
				} catch (error) {
					return {
						score: 0,
						reason: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					};
				}
			},
		},

		/**
		 * Example 4: Stateful evaluator with caching
		 *
		 * This evaluator maintains state across evaluations.
		 * Use for: Performance optimization, rate limiting, batching
		 */
		(() => {
			// Closure to maintain state
			const cache = new Map<string, number>();
			let callCount = 0;

			return {
				type: 'cached-evaluator',
				name: 'Cached Evaluator',
				evaluate: async (config, context) => {
					callCount++;

					const cacheKey = JSON.stringify({
						output: context.output,
						input: context.item.input,
					});

					// Check cache
					if (cache.has(cacheKey)) {
						return {
							score: cache.get(cacheKey)!,
							reason: `Cached result (${callCount} total calls)`,
						};
					}

					// Expensive computation here
					await new Promise((resolve) => setTimeout(resolve, 100));
					const score = Math.random(); // Replace with actual logic

					// Cache result
					cache.set(cacheKey, score);

					return {
						score,
						reason: `Computed (${cache.size} cached results)`,
					};
				},
			};
		})(),
	],
};

/**
 * STEP 2: Export your plugin
 *
 * The plugin must be the default export.
 */
export default plugin;

/**
 * STEP 3: Use your plugin in experiments
 *
 * In cobalt.config.ts:
 * ```typescript
 * export default defineConfig({
 *   plugins: ['./path/to/this/plugin.ts']
 * })
 * ```
 *
 * Or in experiment files:
 * ```typescript
 * await experiment('test', dataset, runner, {
 *   evaluators: [
 *     new Evaluator({
 *       name: 'my-keywords',
 *       type: 'keyword-match',
 *       keywords: ['hello', 'world']
 *     })
 *   ]
 * })
 * ```
 */

/**
 * BEST PRACTICES
 *
 * 1. Error Handling
 *    - Always wrap in try-catch
 *    - Return { score: 0, reason: error } instead of throwing
 *    - Provide clear error messages
 *
 * 2. Scoring
 *    - Always return scores between 0 and 1
 *    - 0 = complete failure, 1 = perfect
 *    - Use reason field to explain the score
 *
 * 3. Performance
 *    - Avoid blocking operations when possible
 *    - Use caching for expensive computations
 *    - Consider rate limiting for API calls
 *
 * 4. Configuration
 *    - Accept configuration via the config parameter
 *    - Provide sensible defaults
 *    - Validate config values
 *
 * 5. Type Safety
 *    - Use TypeScript for better DX
 *    - Define interfaces for config objects
 *    - Type your return values
 *
 * 6. Testing
 *    - Write unit tests for your evaluators
 *    - Test edge cases and error conditions
 *    - Mock external dependencies
 */
