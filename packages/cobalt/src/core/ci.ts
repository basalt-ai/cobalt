/**
 * CI Mode - Threshold validation for continuous integration
 *
 * Validates experiment results against global and per-evaluator thresholds.
 * Supports: score, latency, tokens, cost thresholds + per-evaluator overrides.
 * CI mode is triggered only by the --ci CLI flag.
 */

import type {
	CIResult,
	ExperimentReport,
	ItemResult,
	ScoreStats,
	ThresholdConfig,
	ThresholdMetric,
	ThresholdViolation,
} from '../types/index.js';

/**
 * Validate experiment results against CI thresholds
 */
export function validateThresholds(
	report: ExperimentReport,
	thresholds: ThresholdConfig,
): CIResult {
	const violations: ThresholdViolation[] = [];

	// 1. Global score threshold (avg across ALL evaluators)
	if (thresholds.score) {
		const allEvaluatorNames = Object.keys(report.summary.scores);
		if (allEvaluatorNames.length > 0) {
			const globalAvg =
				allEvaluatorNames.reduce((sum, name) => sum + report.summary.scores[name].avg, 0) /
				allEvaluatorNames.length;

			const globalStats: ScoreStats = {
				avg: globalAvg,
				min: Math.min(...allEvaluatorNames.map((n) => report.summary.scores[n].min)),
				max: Math.max(...allEvaluatorNames.map((n) => report.summary.scores[n].max)),
				p50:
					allEvaluatorNames.reduce((sum, n) => sum + report.summary.scores[n].p50, 0) /
					allEvaluatorNames.length,
				p95:
					allEvaluatorNames.reduce((sum, n) => sum + report.summary.scores[n].p95, 0) /
					allEvaluatorNames.length,
			};

			checkMetricThresholds('score', globalStats, thresholds.score, violations);
		}
	}

	// 2. Latency threshold
	if (thresholds.latency) {
		const latencyStats: ScoreStats = {
			avg: report.summary.avgLatencyMs,
			min: report.summary.avgLatencyMs,
			max: report.summary.avgLatencyMs,
			p50: report.summary.avgLatencyMs,
			p95: report.summary.avgLatencyMs,
		};
		checkMetricThresholds('latency', latencyStats, thresholds.latency, violations);
	}

	// 3. Tokens threshold
	if (thresholds.tokens && report.summary.totalTokens !== undefined) {
		const tokenStats: ScoreStats = {
			avg: report.summary.totalTokens,
			min: report.summary.totalTokens,
			max: report.summary.totalTokens,
			p50: report.summary.totalTokens,
			p95: report.summary.totalTokens,
		};
		checkMetricThresholds('tokens', tokenStats, thresholds.tokens, violations);
	}

	// 4. Cost threshold
	if (thresholds.cost && report.summary.estimatedCost !== undefined) {
		const costStats: ScoreStats = {
			avg: report.summary.estimatedCost,
			min: report.summary.estimatedCost,
			max: report.summary.estimatedCost,
			p50: report.summary.estimatedCost,
			p95: report.summary.estimatedCost,
		};
		checkMetricThresholds('cost', costStats, thresholds.cost, violations);
	}

	// 5. Per-evaluator thresholds
	if (thresholds.evaluators) {
		for (const [evaluatorName, threshold] of Object.entries(thresholds.evaluators)) {
			const stats = report.summary.scores[evaluatorName];

			if (!stats) {
				violations.push({
					category: evaluatorName,
					metric: 'existence',
					expected: 1,
					actual: 0,
					message: `Evaluator "${evaluatorName}" not found in results`,
				});
				continue;
			}

			checkMetricThresholds(evaluatorName, stats, threshold, violations);

			// Check pass rate for per-evaluator thresholds
			if (threshold.passRate !== undefined) {
				checkPassRateThreshold(evaluatorName, report.items, threshold, violations);
			}
		}
	}

	const passed = violations.length === 0;
	const checkedCategories = [
		thresholds.score && 'score',
		thresholds.latency && 'latency',
		thresholds.tokens && 'tokens',
		thresholds.cost && 'cost',
		...(thresholds.evaluators ? Object.keys(thresholds.evaluators) : []),
	].filter(Boolean);

	return {
		passed,
		violations,
		summary: passed
			? `All thresholds passed (${checkedCategories.length} categories checked)`
			: `${violations.length} threshold violation(s) detected`,
	};
}

/**
 * Check metric thresholds (avg, min, max, p50, p95)
 * For score thresholds: actual must be >= expected
 * For latency/tokens/cost: actual must be <= expected (using max)
 */
function checkMetricThresholds(
	category: string,
	stats: ScoreStats,
	threshold: ThresholdMetric,
	violations: ThresholdViolation[],
): void {
	if (threshold.avg !== undefined && stats.avg < threshold.avg) {
		violations.push({
			category,
			metric: 'avg',
			expected: threshold.avg,
			actual: stats.avg,
			message: `${category}: avg ${stats.avg.toFixed(3)} < threshold ${threshold.avg.toFixed(3)}`,
		});
	}

	if (threshold.min !== undefined && stats.min < threshold.min) {
		violations.push({
			category,
			metric: 'min',
			expected: threshold.min,
			actual: stats.min,
			message: `${category}: min ${stats.min.toFixed(3)} < threshold ${threshold.min.toFixed(3)}`,
		});
	}

	if (threshold.max !== undefined && stats.max > threshold.max) {
		violations.push({
			category,
			metric: 'max',
			expected: threshold.max,
			actual: stats.max,
			message: `${category}: max ${stats.max.toFixed(3)} > threshold ${threshold.max.toFixed(3)}`,
		});
	}

	if (threshold.p50 !== undefined && stats.p50 < threshold.p50) {
		violations.push({
			category,
			metric: 'p50',
			expected: threshold.p50,
			actual: stats.p50,
			message: `${category}: p50 ${stats.p50.toFixed(3)} < threshold ${threshold.p50.toFixed(3)}`,
		});
	}

	if (threshold.p95 !== undefined && stats.p95 < threshold.p95) {
		violations.push({
			category,
			metric: 'p95',
			expected: threshold.p95,
			actual: stats.p95,
			message: `${category}: p95 ${stats.p95.toFixed(3)} < threshold ${threshold.p95.toFixed(3)}`,
		});
	}
}

/**
 * Check pass rate threshold for a specific evaluator
 */
function checkPassRateThreshold(
	evaluatorName: string,
	items: ItemResult[],
	threshold: ThresholdMetric,
	violations: ThresholdViolation[],
): void {
	if (threshold.passRate === undefined) return;

	const minScore = threshold.minScore ?? 0.5;
	let passedItems = 0;

	for (const item of items) {
		const evaluation = item.evaluations[evaluatorName];
		if (evaluation && evaluation.score >= minScore) {
			passedItems++;
		}
	}

	const actualPassRate = passedItems / items.length;

	if (actualPassRate < threshold.passRate) {
		violations.push({
			category: evaluatorName,
			metric: 'passRate',
			expected: threshold.passRate,
			actual: actualPassRate,
			message: `${evaluatorName}: pass rate ${(actualPassRate * 100).toFixed(1)}% (${passedItems}/${items.length}) < threshold ${(threshold.passRate * 100).toFixed(1)}% (minScore: ${minScore.toFixed(2)})`,
		});
	}
}
