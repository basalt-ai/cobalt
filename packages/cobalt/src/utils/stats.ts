import type { RunAggregation, ScoreStats } from '../types/index.js';

/**
 * Calculate statistical metrics for an array of scores
 * @param scores - Array of numerical scores
 * @returns Statistical metrics (avg, min, max, p50, p95)
 */
export function calculateStats(scores: number[]): ScoreStats {
	if (scores.length === 0) {
		return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
	}

	const sorted = [...scores].sort((a, b) => a - b);
	const sum = scores.reduce((acc, score) => acc + score, 0);

	return {
		avg: sum / scores.length,
		min: sorted[0],
		max: sorted[sorted.length - 1],
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
	};
}

/**
 * Calculate percentile value
 * @param sortedScores - Sorted array of scores
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
function percentile(sortedScores: number[], p: number): number {
	if (sortedScores.length === 0) return 0;
	if (p <= 0) return sortedScores[0];
	if (p >= 100) return sortedScores[sortedScores.length - 1];

	const index = (p / 100) * (sortedScores.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index - lower;

	if (lower === upper) {
		return sortedScores[lower];
	}

	return sortedScores[lower] * (1 - weight) + sortedScores[upper] * weight;
}

/**
 * Calculate standard deviation for an array of numbers
 * @param values - Array of numerical values
 * @param mean - Optional pre-calculated mean (for efficiency)
 * @returns Standard deviation
 */
export function standardDeviation(values: number[], mean?: number): number {
	if (values.length === 0) return 0;
	if (values.length === 1) return 0;

	const avg = mean !== undefined ? mean : values.reduce((acc, val) => acc + val, 0) / values.length;
	const squareDiffs = values.map((value) => (value - avg) ** 2);
	const avgSquareDiff = squareDiffs.reduce((acc, diff) => acc + diff, 0) / values.length;

	return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate comprehensive statistics for multiple runs
 * @param scores - Array of scores from multiple runs
 * @returns Run aggregation statistics
 */
export function calculateRunStats(scores: number[]): RunAggregation {
	if (scores.length === 0) {
		return {
			mean: 0,
			stddev: 0,
			min: 0,
			max: 0,
			p50: 0,
			p95: 0,
			p99: 0,
			scores: [],
		};
	}

	const sorted = [...scores].sort((a, b) => a - b);
	const mean = scores.reduce((acc, score) => acc + score, 0) / scores.length;

	return {
		mean,
		stddev: standardDeviation(scores, mean),
		min: sorted[0],
		max: sorted[sorted.length - 1],
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
		scores: [...scores], // copy for reference
	};
}
