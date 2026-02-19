import type {
	CIResult,
	EvaluatorDiff,
	ExperimentComparison,
	ExperimentReport,
	ThresholdCheck,
} from './types'

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
	const sections: string[] = []

	const overallStatus = getOverallStatus(comparisons, options.showCIStatus)
	const headerEmoji = overallStatus === 'passed' ? '🟢 ' : overallStatus === 'failed' ? '🔴 ' : ''
	sections.push(`## ${headerEmoji}Cobalt Experiment Results\n`)

	for (const comparison of comparisons) {
		sections.push(generateExperimentSection(comparison, options))
	}

	sections.push('---')
	sections.push('*Generated with [Cobalt](https://github.com/basalt-ai/cobalt)*')

	return sections.join('\n\n')
}

function getOverallStatus(
	comparisons: ExperimentComparison[],
	showCIStatus: boolean,
): 'passed' | 'failed' | 'none' {
	if (!showCIStatus) return 'none'
	const hasCIStatus = comparisons.some(c => c.current.ciStatus)
	if (!hasCIStatus) return 'none'
	const allPassed = comparisons.every(c => !c.current.ciStatus || c.current.ciStatus.passed)
	return allPassed ? 'passed' : 'failed'
}

function generateExperimentSection(
	comparison: ExperimentComparison,
	options: MarkdownOptions,
): string {
	const { current, diffs } = comparison
	const parts: string[] = []
	const hasComparison = comparison.previous !== undefined
	const ciStatus = current.ciStatus
	const hasCIChecks = options.showCIStatus && ciStatus?.checks != null && ciStatus.checks.length > 0

	parts.push(`### ${current.name}`)

	// 1. AI Analysis at top level (not collapsible, plain text)
	const aiSummary = options.aiSummaries?.get(current.name)
	if (aiSummary) {
		parts.push(`\n🤖 **AI Analysis**\n\n${aiSummary}\n`)
	}

	// 2. Score table
	if (hasCIChecks && ciStatus) {
		parts.push(`\n${generateCIScoreTable(current, ciStatus, diffs, hasComparison)}`)
	} else {
		parts.push(`\n${generateScoreTable(current, diffs, hasComparison)}`)
	}

	// 3. Performance table
	parts.push(generatePerformanceTable(current))

	// 4. Summary line
	parts.push(generateSummaryLine(current, comparison, hasComparison))

	return parts.join('\n')
}

/**
 * Merged evaluator + CI threshold table.
 * One row per evaluator metric (avg, p50, p95, min, max).
 * Metrics with thresholds show 🟢/🔴 + threshold value.
 */
function generateCIScoreTable(
	report: ExperimentReport,
	ciStatus: CIResult,
	diffs: EvaluatorDiff[],
	hasComparison: boolean,
): string {
	const headers = hasComparison
		? ['', 'Evaluator', 'Metric', 'Score', 'Threshold', 'Message', 'vs Previous']
		: ['', 'Evaluator', 'Metric', 'Score', 'Threshold', 'Message']

	const lines: string[] = []
	lines.push(`| ${headers.join(' | ')} |`)
	lines.push(`| ${headers.map(() => '---').join(' | ')} |`)

	// Index checks by category+metric for quick lookup
	const checkMap = new Map<string, ThresholdCheck>()
	for (const check of ciStatus.checks) {
		checkMap.set(`${check.category}:${check.metric}`, check)
	}

	const metrics = ['avg', 'p50', 'p95', 'min', 'max'] as const

	for (const [evaluator, stats] of Object.entries(report.summary.scores)) {
		const diff = diffs.find(d => d.evaluator === evaluator)

		for (let i = 0; i < metrics.length; i++) {
			const metric = metrics[i]
			const check = checkMap.get(`${evaluator}:${metric}`)
			const failed = check != null && !check.passed
			const statusEmoji = check ? (check.passed ? '🟢' : '🔴') : ''
			const evaluatorLabel = i === 0 ? `**${evaluator}**` : ''
			const scoreValue = failed ? `**${stats[metric].toFixed(2)}**` : stats[metric].toFixed(2)
			const metricLabel = `**${metric}**`
			const thresholdStr = check ? `${getThresholdOp(metric)} ${check.expected.toFixed(2)}` : '—'
			const message = failed ? check.message : ''

			const row = [statusEmoji, evaluatorLabel, metricLabel, scoreValue, thresholdStr, message]

			if (hasComparison) {
				row.push(i === 0 && diff ? formatDiff(diff) : '')
			}

			lines.push(`| ${row.join(' | ')} |`)
		}

		// Show passRate check if it exists for this evaluator
		const passRateCheck = checkMap.get(`${evaluator}:passRate`)
		if (passRateCheck) {
			const failed = !passRateCheck.passed
			const statusEmoji = passRateCheck.passed ? '🟢' : '🔴'
			const scoreValue = failed
				? `**${(passRateCheck.actual * 100).toFixed(1)}%**`
				: `${(passRateCheck.actual * 100).toFixed(1)}%`
			const row = [
				statusEmoji,
				'',
				'**passRate**',
				scoreValue,
				`≥ ${(passRateCheck.expected * 100).toFixed(1)}%`,
				failed ? passRateCheck.message : '',
			]
			if (hasComparison) row.push('')
			lines.push(`| ${row.join(' | ')} |`)
		}
	}

	// Show non-evaluator checks (score, latency, tokens, cost)
	const nonEvaluatorCategories = ['score', 'latency', 'tokens', 'cost']
	for (const category of nonEvaluatorCategories) {
		const categoryChecks = ciStatus.checks.filter(c => c.category === category)
		if (categoryChecks.length === 0) continue

		for (let i = 0; i < categoryChecks.length; i++) {
			const check = categoryChecks[i]
			const failed = !check.passed
			const statusEmoji = check.passed ? '🟢' : '🔴'
			const evaluatorLabel = i === 0 ? `**${category}**` : ''
			const scoreStr = failed
				? `**${formatCheckValue(check.actual, category)}**`
				: formatCheckValue(check.actual, category)
			const thresholdStr = `${getThresholdOp(check.metric)} ${formatCheckValue(check.expected, category)}`

			const row = [
				statusEmoji,
				evaluatorLabel,
				`**${check.metric}**`,
				scoreStr,
				thresholdStr,
				failed ? check.message : '',
			]
			if (hasComparison) row.push('')
			lines.push(`| ${row.join(' | ')} |`)
		}
	}

	return lines.join('\n')
}

/**
 * Classic score stats table (no CI).
 * One row per evaluator metric (avg, p50, p95, min, max).
 */
function generateScoreTable(
	report: ExperimentReport,
	diffs: EvaluatorDiff[],
	hasComparison: boolean,
): string {
	const headers = hasComparison
		? ['Evaluator', 'Metric', 'Score', 'vs Previous']
		: ['Evaluator', 'Metric', 'Score']

	const lines: string[] = []
	lines.push(`| ${headers.join(' | ')} |`)
	lines.push(`| ${headers.map(() => '---').join(' | ')} |`)

	const metrics = ['avg', 'p50', 'p95', 'min', 'max'] as const

	for (const [evaluator, stats] of Object.entries(report.summary.scores)) {
		const diff = diffs.find(d => d.evaluator === evaluator)

		for (let i = 0; i < metrics.length; i++) {
			const metric = metrics[i]
			const evaluatorLabel = i === 0 ? `**${evaluator}**` : ''
			const row = [evaluatorLabel, `**${metric}**`, stats[metric].toFixed(2)]

			if (hasComparison) {
				row.push(i === 0 && diff ? formatDiff(diff) : '')
			}

			lines.push(`| ${row.join(' | ')} |`)
		}
	}

	return lines.join('\n')
}

function generatePerformanceTable(report: ExperimentReport): string {
	const parts: string[] = []
	parts.push('\n#### ⚡ Performance')

	const headers = ['Metric', 'Avg', 'P50', 'P95', 'Min', 'Max']
	parts.push(`| ${headers.join(' | ')} |`)
	parts.push(`| ${headers.map(() => '---').join(' | ')} |`)

	// Latency row
	if (report.items.length > 0) {
		const latencies = report.items.map(item => item.latencyMs)
		const sorted = [...latencies].sort((a, b) => a - b)
		const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length
		const min = sorted[0]
		const max = sorted[sorted.length - 1]
		const p50 = percentile(sorted, 50)
		const p95 = percentile(sorted, 95)

		parts.push(
			`| Latency | ${fmtMs(avg)} | ${fmtMs(p50)} | ${fmtMs(p95)} | ${fmtMs(min)} | ${fmtMs(max)} |`,
		)
	} else {
		const ms = report.summary.avgLatencyMs
		parts.push(`| Latency | ${fmtMs(ms)} | — | — | — | — |`)
	}

	// Tokens row (always shown)
	if (report.summary.totalTokens !== undefined && report.summary.totalTokens > 0) {
		const total = report.summary.totalTokens
		const avgTokens = Math.round(total / report.summary.totalItems)
		parts.push(
			`| Tokens | ${avgTokens.toLocaleString()} /item | — | — | — | ${total.toLocaleString()} total |`,
		)
	} else {
		parts.push('| Tokens | — | — | — | — | — |')
	}

	return parts.join('\n')
}

function generateSummaryLine(
	report: ExperimentReport,
	comparison: ExperimentComparison,
	hasComparison: boolean,
): string {
	const { summary } = report
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

	return `\n**Summary:** ${summaryParts.join(' · ')}`
}

function formatDiff(diff: EvaluatorDiff): string {
	if (diff.direction === 'unchanged') return '—'
	const arrow = diff.direction === 'improved' ? '↑' : '↓'
	const emoji = diff.direction === 'improved' ? '🟢' : '🔴'
	const sign = diff.diff > 0 ? '+' : ''
	return `${emoji} ${arrow} ${sign}${diff.diff.toFixed(3)} (${sign}${diff.percentChange.toFixed(1)}%)`
}

function getThresholdOp(metric: string): string {
	if (metric === 'max') return '≤'
	return '≥'
}

function formatCheckValue(value: number, category: string): string {
	if (category === 'latency') return fmtMs(value)
	if (category === 'cost') return `$${value.toFixed(4)}`
	if (category === 'tokens') return value.toLocaleString()
	return value.toFixed(3)
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0
	if (p <= 0) return sorted[0]
	if (p >= 100) return sorted[sorted.length - 1]
	const index = (p / 100) * (sorted.length - 1)
	const lower = Math.floor(index)
	const upper = Math.ceil(index)
	if (lower === upper) return sorted[lower]
	const weight = index - lower
	return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function fmtMs(ms: number): string {
	if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
	return `${Math.round(ms)}ms`
}
