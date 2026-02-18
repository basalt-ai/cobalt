import type { CIResult, EvaluatorDiff, ExperimentComparison } from './types'

interface MarkdownOptions {
	showCIStatus: boolean
	aiSummaries?: Map<string, string>
}

/**
 * Generate the full PR comment body from experiment comparisons.
 */
export function generateCommentBody(
	comparisons: ExperimentComparison[],
	options: MarkdownOptions,
): string {
	const sections: string[] = ['## Cobalt Experiment Results\n']

	for (const comparison of comparisons) {
		sections.push(generateExperimentSection(comparison, options))
	}

	sections.push('---')
	sections.push('*Generated with [Cobalt](https://github.com/basalt-ai/cobalt)*')

	return sections.join('\n\n')
}

function generateExperimentSection(
	comparison: ExperimentComparison,
	options: MarkdownOptions,
): string {
	const { current, diffs } = comparison
	const parts: string[] = []
	const hasComparison = comparison.previous !== undefined

	parts.push(`### ${current.name}`)

	// Score table
	const headers = hasComparison
		? ['Evaluator', 'Avg', 'P50', 'P95', 'Min', 'Max', 'vs Previous']
		: ['Evaluator', 'Avg', 'P50', 'P95', 'Min', 'Max']

	parts.push(`| ${headers.join(' | ')} |`)
	parts.push(`| ${headers.map(() => '---').join(' | ')} |`)

	for (const [evaluator, stats] of Object.entries(current.summary.scores)) {
		const row = [
			`**${evaluator}**`,
			stats.avg.toFixed(2),
			stats.p50.toFixed(2),
			stats.p95.toFixed(2),
			stats.min.toFixed(2),
			stats.max.toFixed(2),
		]

		if (hasComparison) {
			const diff = diffs.find(d => d.evaluator === evaluator)
			row.push(diff ? formatDiff(diff) : '*new*')
		}

		parts.push(`| ${row.join(' | ')} |`)
	}

	// Summary line
	const { summary } = current
	const summaryParts = [
		`${summary.totalItems} items`,
		`${(summary.totalDurationMs / 1000).toFixed(1)}s`,
	]

	if (summary.estimatedCost !== undefined) {
		summaryParts.push(`$${summary.estimatedCost.toFixed(4)}`)
	}

	if (summary.totalTokens !== undefined) {
		summaryParts.push(`${summary.totalTokens.toLocaleString()} tokens`)
	}

	if (hasComparison) {
		if (comparison.improvements > 0) {
			summaryParts.push(`🟢 ${comparison.improvements} improved`)
		}
		if (comparison.regressions > 0) {
			summaryParts.push(`🔴 ${comparison.regressions} regressed`)
		}
		if (comparison.improvements === 0 && comparison.regressions === 0) {
			summaryParts.push('no changes')
		}
	}

	parts.push(`\n**Summary:** ${summaryParts.join(' | ')}`)

	// CI status
	if (options.showCIStatus && current.ciStatus) {
		parts.push(formatCIStatus(current.ciStatus))
	}

	// AI analysis
	const aiSummary = options.aiSummaries?.get(current.name)
	if (aiSummary) {
		parts.push(`\n<details>\n<summary>AI Analysis</summary>\n\n${aiSummary}\n</details>`)
	}

	return parts.join('\n')
}

function formatDiff(diff: EvaluatorDiff): string {
	if (diff.direction === 'unchanged') return '—'

	const arrow = diff.direction === 'improved' ? '↑' : '↓'
	const emoji = diff.direction === 'improved' ? '🟢' : '🔴'
	const sign = diff.diff > 0 ? '+' : ''

	return `${emoji} ${arrow} ${sign}${diff.diff.toFixed(3)} (${sign}${diff.percentChange.toFixed(1)}%)`
}

function formatCIStatus(ciStatus: CIResult): string {
	if (ciStatus.passed) {
		return '\n**CI:** All thresholds passed'
	}

	const violations = ciStatus.violations
		.map(v => `| ${v.category} | ${v.metric} | ${v.expected} | ${v.actual} | ${v.message} |`)
		.join('\n')

	return [
		'\n<details>',
		'<summary>CI Status: FAILED</summary>',
		'',
		'| Category | Metric | Expected | Actual | Message |',
		'| --- | --- | --- | --- | --- |',
		violations,
		'</details>',
	].join('\n')
}
