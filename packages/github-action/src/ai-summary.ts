import * as core from '@actions/core'
import type { AIProvider } from './inputs'
import type { ExperimentComparison } from './types'

/**
 * Generate AI-powered analysis of experiment results.
 * Supports both OpenAI and Anthropic providers.
 */
export async function generateAISummaries(
	comparisons: ExperimentComparison[],
	apiKey: string,
	provider: AIProvider = 'openai',
): Promise<Map<string, string>> {
	const summaries = new Map<string, string>()

	try {
		const { generateText } = await import('ai')
		const model = await resolveModel(apiKey, provider)

		for (const comparison of comparisons) {
			try {
				const prompt = buildPrompt(comparison)
				const { text } = await generateText({
					model,
					prompt,
					maxTokens: 500,
				})
				summaries.set(comparison.experimentName, text)
			} catch (error) {
				core.warning(`AI summary failed for "${comparison.experimentName}": ${error}`)
			}
		}
	} catch (error) {
		core.warning(`AI summary initialization failed: ${error}`)
	}

	return summaries
}

async function resolveModel(apiKey: string, provider: AIProvider) {
	if (provider === 'anthropic') {
		const { createAnthropic } = await import('@ai-sdk/anthropic')
		const anthropic = createAnthropic({ apiKey })
		return anthropic('claude-haiku-4-5-20251001')
	}
	const { createOpenAI } = await import('@ai-sdk/openai')
	const openai = createOpenAI({ apiKey })
	return openai('gpt-4o-mini')
}

function buildPrompt(comparison: ExperimentComparison): string {
	const { current, previous, diffs } = comparison
	const { summary } = current

	const parts: string[] = [
		'Analyze these AI experiment results concisely (2-4 sentences).',
		'',
		`Experiment: ${current.name}`,
		`Items tested: ${summary.totalItems}`,
		`Duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s`,
		'',
		'Scores:',
	]

	for (const [evaluator, stats] of Object.entries(summary.scores)) {
		parts.push(
			`- ${evaluator}: avg=${stats.avg.toFixed(2)}, p50=${stats.p50.toFixed(2)}, p95=${stats.p95.toFixed(2)}`,
		)
	}

	if (previous && diffs.length > 0) {
		parts.push('')
		parts.push('Changes vs previous run:')
		for (const diff of diffs) {
			const sign = diff.diff > 0 ? '+' : ''
			parts.push(
				`- ${diff.evaluator}: ${sign}${diff.diff.toFixed(3)} (${sign}${diff.percentChange.toFixed(1)}%) — ${diff.direction}`,
			)
		}
	}

	if (current.ciStatus) {
		parts.push('')
		parts.push(`CI Status: ${current.ciStatus.passed ? 'PASSED' : 'FAILED'}`)
		if (!current.ciStatus.passed) {
			for (const v of current.ciStatus.violations) {
				parts.push(`- Violation: ${v.message}`)
			}
		}
	}

	const errorCount = current.items.filter(i => i.error).length
	if (errorCount > 0) {
		parts.push('')
		parts.push(`Errors: ${errorCount} item(s) had errors`)
	}

	parts.push('')
	parts.push(
		'Provide a brief analysis. Focus on: overall quality, notable improvements/regressions, and actionable insights. Keep it short and direct.',
	)

	return parts.join('\n')
}
