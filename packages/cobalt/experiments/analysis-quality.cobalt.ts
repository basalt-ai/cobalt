/**
 * Cobalt Analysis Quality Experiment
 *
 * Tests the quality of auto-generated run analysis and comparison analysis
 * displayed in the Cobalt dashboard.
 *
 * Evaluates: length compliance, insight coverage, insight accuracy, and recommendations.
 *
 * To run: pnpm cobalt run experiments/analysis-quality.cobalt.ts
 * Requires: OPENAI_API_KEY environment variable
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { formatCompareContext, formatRunContext } from '../src/dashboard/api/chat.js'
import { Dataset, Evaluator, experiment } from '../src/index.js'
import type { ExperimentReport } from '../src/types/index.js'
import { codeReviewReport, highQualityReport, problematicReport } from './_fixtures.js'

// ============================================================================
// Dataset: Analysis scenarios
// ============================================================================

const dataset = new Dataset({
	items: [
		// --- Run Analysis ---
		{
			input: 'Analyze high-quality customer support run',
			analysisType: 'run',
			reportKey: 'high',
			expectedInsights: ['high', 'helpfulness', 'outlier', 'refund'],
		},
		{
			input: 'Analyze problematic customer support run',
			analysisType: 'run',
			reportKey: 'problematic',
			expectedInsights: ['low', 'helpfulness', 'relevance', 'vague'],
		},
		{
			input: 'Analyze code review agent run',
			analysisType: 'run',
			reportKey: 'codeReview',
			expectedInsights: ['accuracy', 'thoroughness', 'improve'],
		},
		{
			input: 'Analyze high-quality run (consistency check)',
			analysisType: 'run',
			reportKey: 'high',
			expectedInsights: ['high', 'helpfulness', 'format'],
		},
		// --- Compare Analysis ---
		{
			input: 'Compare problematic → high quality (improvement)',
			analysisType: 'compare',
			reportKey: 'compare-improvement',
			expectedInsights: ['improve', 'relevance', 'helpfulness'],
		},
		{
			input: 'Compare high quality → problematic (regression)',
			analysisType: 'compare',
			reportKey: 'compare-regression',
			expectedInsights: ['regress', 'drop', 'decline'],
		},
		{
			input: 'Compare 3 runs across experiments',
			analysisType: 'compare',
			reportKey: 'compare-three-way',
			expectedInsights: ['three', 'customer', 'code-review'],
		},
		{
			input: 'Compare identical high-quality runs (stable)',
			analysisType: 'compare',
			reportKey: 'compare-stable',
			expectedInsights: ['stable', 'consistent', 'similar'],
		},
	],
})

// ============================================================================
// Runner: Replicate the production analysis flow
// ============================================================================

const RUN_ANALYSIS_PROMPT = `You are an AI assistant analyzing experiment results for Cobalt, an AI testing framework.
Provide a concise analysis (2-4 sentences) highlighting key findings, low-scoring items, and actionable recommendations.`

const COMPARE_ANALYSIS_PROMPT = `You are an AI assistant comparing experiment runs for Cobalt, an AI testing framework.
Provide a concise comparison analysis (2-4 sentences) highlighting improvements, regressions, and recommendations.`

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const model = openai('gpt-5-mini')

function getReportForKey(key: string) {
	switch (key) {
		case 'high':
			return highQualityReport
		case 'problematic':
			return problematicReport
		case 'codeReview':
			return codeReviewReport
		default:
			return highQualityReport
	}
}

async function analysisRunner({ item }: { item: Record<string, unknown> }) {
	const analysisType = item.analysisType as string
	const reportKey = item.reportKey as string

	let systemPrompt: string
	let userPrompt: string

	if (analysisType === 'run') {
		const report = getReportForKey(reportKey)
		systemPrompt = RUN_ANALYSIS_PROMPT
		userPrompt = `Analyze this experiment run:\n\n${formatRunContext(report)}`
	} else {
		// Compare analysis
		let reports: ExperimentReport[]
		switch (reportKey) {
			case 'compare-improvement':
				reports = [problematicReport, highQualityReport]
				break
			case 'compare-regression':
				reports = [highQualityReport, problematicReport]
				break
			case 'compare-three-way':
				reports = [problematicReport, highQualityReport, codeReviewReport]
				break
			case 'compare-stable':
				reports = [highQualityReport, highQualityReport]
				break
			default:
				reports = [problematicReport, highQualityReport]
		}
		systemPrompt = COMPARE_ANALYSIS_PROMPT
		userPrompt = `Compare these experiment runs:\n\n${formatCompareContext(reports)}`
	}

	const result = await generateText({
		model,
		system: systemPrompt,
		prompt: userPrompt,
	})

	return {
		output: result.text,
		metadata: {
			model: 'gpt-5-mini',
			analysisType,
			reportKey,
			inputTokens: result.usage?.promptTokens,
			outputTokens: result.usage?.completionTokens,
		},
	}
}

// ============================================================================
// Evaluators
// ============================================================================

const evaluators = [
	// 1. Length Compliance (function) — checks the "2-4 sentences" constraint
	new Evaluator({
		name: 'length-compliance',
		type: 'function',
		fn: ({ output }) => {
			const text = String(output)
			const sentences = text
				.split(/[.!?]+/)
				.map(s => s.trim())
				.filter(s => s.length > 5)
			const count = sentences.length

			if (count >= 2 && count <= 4) {
				return { score: 1.0, reason: `${count} sentences — within 2-4 range` }
			}
			if (count === 1 || count === 5) {
				return { score: 0.6, reason: `${count} sentences — off by one from 2-4 range` }
			}
			return { score: 0.2, reason: `${count} sentences — outside acceptable range` }
		},
	}),

	// 2. Insight Coverage (function) — checks if expected themes appear
	new Evaluator({
		name: 'insight-coverage',
		type: 'function',
		fn: ({ item, output }) => {
			const insights = item.expectedInsights as string[]
			const text = String(output).toLowerCase()
			const found = insights.filter(insight => text.includes(insight.toLowerCase()))
			const score = insights.length > 0 ? found.length / insights.length : 0

			return {
				score,
				reason: `Found ${found.length}/${insights.length} insights: [${found.join(', ')}]`,
			}
		},
	}),

	// 3. Insight Accuracy (llm-judge, scale) — are claims factually correct?
	new Evaluator({
		name: 'insight-accuracy',
		type: 'llm-judge',
		scoring: 'scale',
		prompt: `You are evaluating whether an AI-generated analysis is factually accurate relative to experiment data.

The analysis task was: {{input}}
The AI generated: {{output}}

Rate the factual accuracy from 0.0 to 1.0:
- 1.0: All claims about scores, trends, and items are factually correct
- 0.7: Mostly accurate with minor imprecisions (e.g., approximate scores)
- 0.4: Some claims are incorrect or misleading
- 0.0: Major factual errors or fabricated data

Note: The analysis should correctly identify the direction of changes (improvement vs regression) and highlight the right evaluators. Approximate score values are acceptable.

Respond with JSON: { "score": <number>, "reason": "<brief explanation>" }`,
	}),

	// 4. Has Recommendation (llm-judge, boolean + chainOfThought)
	new Evaluator({
		name: 'has-recommendation',
		type: 'llm-judge',
		scoring: 'boolean',
		chainOfThought: true,
		prompt: `You are evaluating whether an AI-generated experiment analysis includes an actionable recommendation.

The analysis task was: {{input}}
The AI generated: {{output}}

Does the analysis include at least one actionable recommendation — something the developer could DO to improve their results?
A pure description of scores or trends does NOT count.
An actionable recommendation means a concrete next step (e.g., "improve prompt clarity", "add more training examples", "review failing items").

Answer true if there is at least one actionable recommendation, false otherwise.`,
	}),
]

// ============================================================================
// Run Experiment
// ============================================================================

experiment('cobalt-analysis-quality', dataset, analysisRunner, {
	evaluators,
	concurrency: 3,
	timeout: 30_000,
	tags: ['dogfood', 'analysis', 'ai-features'],
	thresholds: {
		evaluators: {
			'length-compliance': { avg: 0.7 },
			'insight-coverage': { avg: 0.35 },
			'insight-accuracy': { avg: 0.55 },
			'has-recommendation': { avg: 0.6 },
		},
	},
})
