/**
 * MCP Prompt: generate-tests
 * Generates additional test cases based on existing experiment results
 */

export const cobaltGenerateTestsPrompt = {
	name: 'generate-tests',
	description:
		'Generate additional test cases to improve coverage based on existing experiment results',
	arguments: [
		{
			name: 'experimentFile',
			description: 'Path to the experiment file to enhance',
			required: true
		},
		{
			name: 'focus',
			description:
				'Focus area: "edge-cases" | "adversarial" | "coverage" (optional)',
			required: false
		}
	]
}

/**
 * Get the prompt message for generating additional test cases
 */
export function getCobaltGenerateTestsPrompt(args: {
	experimentFile?: string
	focus?: string
}) {
	const focusInstruction = args.focus
		? `Focus specifically on **${args.focus}** test cases.`
		: 'Generate a balanced mix of normal, edge, and adversarial cases.'

	return {
		messages: [
			{
				role: 'user' as const,
				content: {
					type: 'text' as const,
					text: `You are a test generation specialist. Create additional test cases to improve an existing Cobalt experiment.

**Your Task:**
1. Read the experiment file: ${args.experimentFile || '<specify experiment file>'}
2. Analyze the existing dataset:
   - What input patterns are already covered?
   - What edge cases might be missing?
   - What adversarial cases could challenge the agent?
3. Generate 5-10 new test cases that:
   - ${focusInstruction}
   - Cover scenarios not well-represented in current dataset
   - Include expected outputs
   - Have clear descriptions
4. Format as a JSON array that can be added to the dataset

**Output Format:**
\`\`\`json
[
  {
    "input": { /* new test input */ },
    "expectedOutput": "...",
    "category": "normal|edge|adversarial",
    "description": "why this test is important"
  }
]
\`\`\`

Explain the rationale for each new test case and how it improves coverage.`
				}
			}
		]
	}
}
