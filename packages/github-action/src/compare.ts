import type { EvaluatorDiff, ExperimentComparison, ExperimentReport } from './types'

const UNCHANGED_THRESHOLD = 0.001

/**
 * Compare two experiment reports and produce a structured diff.
 * Replicates the logic from packages/cobalt/src/cli/commands/compare.ts.
 */
export function compareReports(
	current: ExperimentReport,
	previous: ExperimentReport,
): ExperimentComparison {
	const diffs: EvaluatorDiff[] = []

	const allEvaluators = new Set([
		...Object.keys(current.summary.scores),
		...Object.keys(previous.summary.scores),
	])

	for (const evaluator of allEvaluators) {
		const candidateAvg = current.summary.scores[evaluator]?.avg ?? 0
		const baselineAvg = previous.summary.scores[evaluator]?.avg ?? 0
		const diff = candidateAvg - baselineAvg
		const percentChange = baselineAvg !== 0 ? (diff / baselineAvg) * 100 : 0

		const direction: EvaluatorDiff['direction'] =
			Math.abs(diff) < UNCHANGED_THRESHOLD ? 'unchanged' : diff > 0 ? 'improved' : 'regressed'

		diffs.push({
			evaluator,
			baselineAvg,
			candidateAvg,
			diff,
			percentChange,
			direction,
		})
	}

	return {
		experimentName: current.name,
		current,
		previous,
		diffs,
		improvements: diffs.filter(d => d.direction === 'improved').length,
		regressions: diffs.filter(d => d.direction === 'regressed').length,
	}
}

/**
 * Build comparisons for a set of current reports against previous reports.
 * Matches experiments by name.
 */
export function buildComparisons(
	currentReports: ExperimentReport[],
	previousReports: ExperimentReport[] | null,
): ExperimentComparison[] {
	return currentReports.map(report => {
		const previous = previousReports?.find(r => r.name === report.name)
		if (previous) {
			return compareReports(report, previous)
		}
		return {
			experimentName: report.name,
			current: report,
			diffs: [],
			improvements: 0,
			regressions: 0,
		}
	})
}
