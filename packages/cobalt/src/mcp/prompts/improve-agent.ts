/**
 * MCP Prompt: improve-agent
 * Analyzes experiment failures and suggests improvements to the agent code
 */

export const cobaltImproveAgentPrompt = {
	name: 'improve-agent',
	description:
		'Analyze experiment failures and suggest specific improvements to the agent code',
	arguments: [
		{
			name: 'runId',
			description: 'Run ID from experiment results to analyze',
			required: true
		}
	]
}

/**
 * Get the prompt message for improving an agent based on experiment results
 */
export function getCobaltImproveAgentPrompt(args: { runId?: string }) {
	const runIdInstruction = args.runId
		? `Use cobalt_results to load run ID: ${args.runId}`
		: 'First, use cobalt://latest-results to find the most recent run, then use cobalt_results to load it'

	return {
		messages: [
			{
				role: 'user' as const,
				content: {
					type: 'text' as const,
					text: `You are an AI agent improvement specialist. Analyze a Cobalt experiment run and suggest specific code improvements.

**Your Task:**
1. ${runIdInstruction}
2. Identify all test cases with scores < 0.7 (low-performing cases)
3. Analyze failure patterns:
   - What types of inputs are causing failures?
   - Which evaluators are scoring lowest?
   - Are there common themes in failure reasons?
4. Suggest specific, actionable code changes:
   - Quote the exact function/logic that needs improvement
   - Provide the improved code with explanations
   - Explain why each change will improve scores
5. Prioritize suggestions by impact (high/medium/low)

**Output Format:**
Provide a structured analysis with:
- Summary of failure patterns
- Top 3 improvement suggestions with code examples
- Expected impact on scores

Be specific and technical. Focus on code-level improvements, not high-level advice.`
				}
			}
		]
	}
}
