/**
 * LLM Prompt: Analyze agent source code
 * Extracts input/output schema, purpose, and edge cases
 */

export function getAnalyzeAgentPrompt(sourceCode: string): string {
	return `Analyze the following AI agent source code and extract key information:

\`\`\`typescript
${sourceCode}
\`\`\`

Please provide a structured analysis in JSON format with the following fields:

{
  "purpose": "Brief description of what the agent does",
  "inputSchema": {
    "description": "Description of expected input format",
    "fields": [
      { "name": "fieldName", "type": "string|number|object|array", "required": true, "description": "field purpose" }
    ],
    "example": { "exampleInput": "value" }
  },
  "outputSchema": {
    "description": "Description of output format",
    "type": "string|number|object|array",
    "example": "example output"
  },
  "keyBehaviors": [
    "List of important behaviors or transformations the agent performs"
  ],
  "edgeCases": [
    "Potential edge cases or failure modes to test"
  ],
  "dependencies": [
    "External APIs or services the agent calls"
  ]
}

Be specific and thorough. If the code doesn't clearly show certain aspects, make reasonable inferences based on function signatures and logic.`;
}
