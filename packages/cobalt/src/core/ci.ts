/**
 * CI Mode - Threshold validation for continuous integration
 *
 * Enables quality gates by validating experiment results against configured thresholds.
 * Supports multiple threshold types: avg, min, max, p50, p95, p99, and pass rate.
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
 *
 * @param report - Experiment report with summary and item results
 * @param thresholds - Threshold configuration per evaluator
 * @returns CI result with pass/fail status and violations
 */
export function validateThresholds(
	report: ExperimentReport,
	thresholds: ThresholdConfig,
): CIResult {
	const violations: ThresholdViolation[] = [];

	for (const [evaluatorName, threshold] of Object.entries(thresholds)) {
		// Check if evaluator exists in report
		const stats = report.summary.scores[evaluatorName];

		if (!stats) {
			violations.push({
				evaluator: evaluatorName,
				metric: 'existence',
				expected: 1,
				actual: 0,
				message: `Evaluator "${evaluatorName}" not found in results`,
			});
			continue;
		}

		// Check score-based thresholds
		const scoreViolation = checkScoreThreshold(evaluatorName, stats, threshold);
		if (scoreViolation) {
			violations.push(scoreViolation);
		}

		// Check pass rate threshold
		if (threshold.passRate !== undefined) {
			const passRateViolation = checkPassRateThreshold(evaluatorName, report.items, threshold);
			if (passRateViolation) {
				violations.push(passRateViolation);
			}
		}
	}

	const passed = violations.length === 0;

	return {
		passed,
		violations,
		summary: passed
			? `All thresholds passed (${Object.keys(thresholds).length} evaluators checked)`
			: `${violations.length} threshold violation(s) detected`,
	};
}

/**
 * Check score-based thresholds (avg, min, max, p50, p95, p99)
 *
 * @param evaluatorName - Name of the evaluator
 * @param stats - Score statistics from experiment summary
 * @param threshold - Threshold configuration
 * @returns Violation if any threshold is not met, null otherwise
 */
function checkScoreThreshold(
	evaluatorName: string,
	stats: ScoreStats,
	threshold: ThresholdMetric,
): ThresholdViolation | null {
	// Check avg threshold
	if (threshold.avg !== undefined && stats.avg < threshold.avg) {
		return {
			evaluator: evaluatorName,
			metric: 'avg',
			expected: threshold.avg,
			actual: stats.avg,
			message: `${evaluatorName}: avg score ${stats.avg.toFixed(3)} < threshold ${threshold.avg.toFixed(3)}`,
		};
	}

	// Check min threshold
	if (threshold.min !== undefined && stats.min < threshold.min) {
		return {
			evaluator: evaluatorName,
			metric: 'min',
			expected: threshold.min,
			actual: stats.min,
			message: `${evaluatorName}: min score ${stats.min.toFixed(3)} < threshold ${threshold.min.toFixed(3)}`,
		};
	}

	// Check max threshold (typically not used, but supported)
	if (threshold.max !== undefined && stats.max < threshold.max) {
		return {
			evaluator: evaluatorName,
			metric: 'max',
			expected: threshold.max,
			actual: stats.max,
			message: `${evaluatorName}: max score ${stats.max.toFixed(3)} < threshold ${threshold.max.toFixed(3)}`,
		};
	}

	// Check p50 threshold
	if (threshold.p50 !== undefined && stats.p50 < threshold.p50) {
		return {
			evaluator: evaluatorName,
			metric: 'p50',
			expected: threshold.p50,
			actual: stats.p50,
			message: `${evaluatorName}: p50 score ${stats.p50.toFixed(3)} < threshold ${threshold.p50.toFixed(3)}`,
		};
	}

	// Check p95 threshold
	if (threshold.p95 !== undefined && stats.p95 < threshold.p95) {
		return {
			evaluator: evaluatorName,
			metric: 'p95',
			expected: threshold.p95,
			actual: stats.p95,
			message: `${evaluatorName}: p95 score ${stats.p95.toFixed(3)} < threshold ${threshold.p95.toFixed(3)}`,
		};
	}

	// Check p99 threshold
	if (threshold.p99 !== undefined && stats.p99 < threshold.p99) {
		return {
			evaluator: evaluatorName,
			metric: 'p99',
			expected: threshold.p99,
			actual: stats.p99,
			message: `${evaluatorName}: p99 score ${stats.p99.toFixed(3)} < threshold ${threshold.p99.toFixed(3)}`,
		};
	}

	return null;
}

/**
 * Check pass rate threshold
 *
 * Validates that a minimum percentage of items scored above a threshold.
 *
 * @param evaluatorName - Name of the evaluator
 * @param items - Item results from experiment
 * @param threshold - Threshold configuration
 * @returns Violation if pass rate is not met, null otherwise
 */
function checkPassRateThreshold(
	evaluatorName: string,
	items: ItemResult[],
	threshold: ThresholdMetric,
): ThresholdViolation | null {
	if (threshold.passRate === undefined) {
		return null;
	}

	// minScore defaults to 0.5 if not specified
	const minScore = threshold.minScore ?? 0.5;

	// Count items that pass the minimum score
	let passedItems = 0;

	for (const item of items) {
		const evaluation = item.evaluations[evaluatorName];
		if (evaluation && evaluation.score >= minScore) {
			passedItems++;
		}
	}

	const actualPassRate = passedItems / items.length;
	const expectedPassRate = threshold.passRate;

	if (actualPassRate < expectedPassRate) {
		return {
			evaluator: evaluatorName,
			metric: 'passRate',
			expected: expectedPassRate,
			actual: actualPassRate,
			message: `${evaluatorName}: pass rate ${(actualPassRate * 100).toFixed(1)}% (${passedItems}/${items.length}) < threshold ${(expectedPassRate * 100).toFixed(1)}% (minScore: ${minScore.toFixed(2)})`,
		};
	}

	return null;
}
