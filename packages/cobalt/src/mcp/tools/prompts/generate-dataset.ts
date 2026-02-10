/**
 * LLM Prompt: Generate test dataset
 * Creates diverse test cases including normal, edge, and adversarial cases
 */

export interface AgentAnalysis {
	purpose: string;
	inputSchema: any;
	outputSchema: any;
	keyBehaviors: string[];
	edgeCases: string[];
	dependencies: string[];
}

export function getGenerateDatasetPrompt(analysis: AgentAnalysis, datasetSize: number): string {
	return `Based on this agent analysis:

${JSON.stringify(analysis, null, 2)}

Generate a diverse test dataset with ${datasetSize} test cases in JSON format.

Include:
- ${Math.floor(datasetSize * 0.6)} normal/typical cases
- ${Math.floor(datasetSize * 0.2)} edge cases
- ${Math.floor(datasetSize * 0.2)} adversarial/challenging cases

For each test case, provide:
1. Input matching the inputSchema
2. Expected output (what a correct agent should produce)
3. Category: "normal", "edge", or "adversarial"
4. Description: why this test case is important

Return as a JSON array:
[
  {
    "input": { /* matches inputSchema */ },
    "expectedOutput": "expected result",
    "category": "normal|edge|adversarial",
    "description": "why this test matters"
  }
]

Make test cases realistic and diverse. Test different aspects of the agent's behavior.`;
}
