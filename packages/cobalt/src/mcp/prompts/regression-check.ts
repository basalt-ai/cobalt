/**
 * MCP Prompt: regression-check
 * Compares two experiment runs to detect regressions
 */

export const cobaltRegressionCheckPrompt = {
	name: 'regression-check',
	description: 'Compare two experiment runs and identify regressions or improvements',
	arguments: [
		{
			name: 'baselineRunId',
			description: 'Run ID of the baseline (earlier) run',
			required: true,
		},
		{
			name: 'currentRunId',
			description: 'Run ID of the current (later) run to compare',
			required: true,
		},
	],
};

/**
 * Get the prompt message for regression checking
 */
export function getCobaltRegressionCheckPrompt(args: {
	baselineRunId?: string;
	currentRunId?: string;
}) {
	return {
		messages: [
			{
				role: 'user' as const,
				content: {
					type: 'text' as const,
					text: `You are a regression detection specialist. Compare two Cobalt experiment runs to identify changes in performance.

**Your Task:**
1. Load both runs using cobalt_compare:
   - Baseline: ${args.baselineRunId || '<specify baseline run ID>'}
   - Current: ${args.currentRunId || '<specify current run ID>'}
2. Analyze score changes:
   - Overall score trends (improved/degraded/unchanged)
   - Per-evaluator score changes
   - Per-item score changes (identify specific cases that regressed)
3. Identify regressions:
   - Any evaluator with >5% score drop is a regression
   - Any individual item with >0.2 score drop
   - New failure cases (previously passing, now failing)
4. Identify improvements:
   - Evaluators with >5% score increase
   - Previously failing cases that now pass
5. Provide a regression verdict:
   - **PASS**: No significant regressions
   - **WARN**: Minor regressions (5-10% drop in any evaluator)
   - **FAIL**: Major regressions (>10% drop or new failures)

**Output Format:**
Provide a structured report with:
- Verdict: PASS/WARN/FAIL
- Summary statistics (avg score change, # regressions, # improvements)
- Detailed regression list (if any)
- Root cause hypotheses for regressions

Be precise with numbers. Use percentages and absolute differences.`,
				},
			},
		],
	};
}
