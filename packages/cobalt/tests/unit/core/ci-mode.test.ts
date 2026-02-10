import { describe, expect, it } from 'vitest';
import { validateThresholds } from '../../../src/core/ci.js';
import type { ExperimentReport, ThresholdConfig } from '../../../src/types/index.js';

/**
 * Helper to create a mock experiment report
 */
function createMockReport(
	scores: Record<string, { avg: number; min: number; max: number; p50: number; p95: number }>,
): ExperimentReport {
	return {
		id: 'test-id',
		name: 'test-experiment',
		timestamp: '2024-01-01T00:00:00.000Z',
		tags: [],
		config: {
			runs: 1,
			concurrency: 5,
			timeout: 30000,
			evaluators: Object.keys(scores),
		},
		summary: {
			totalItems: 10,
			totalDurationMs: 5000,
			avgLatencyMs: 500,
			scores,
		},
		items: Array.from({ length: 10 }, (_, i) => ({
			index: i,
			input: { test: 'input' },
			output: { output: 'test' },
			latencyMs: 500,
			evaluations: Object.fromEntries(
				Object.keys(scores).map((name) => [name, { score: 0.8, reason: 'test' }]),
			),
			runs: [],
		})),
	};
}

describe('CI Mode - validateThresholds', () => {
	describe('Score Thresholds', () => {
		it('should pass when avg score meets threshold', () => {
			const report = createMockReport({
				relevance: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92 },
			});

			const thresholds: ThresholdConfig = {
				relevance: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(true);
			expect(result.violations).toHaveLength(0);
			expect(result.summary).toContain('All thresholds passed');
		});

		it('should fail when avg score below threshold', () => {
			const report = createMockReport({
				relevance: { avg: 0.75, min: 0.6, max: 0.9, p50: 0.75, p95: 0.85 },
			});

			const thresholds: ThresholdConfig = {
				relevance: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations).toHaveLength(1);
			expect(result.violations[0].evaluator).toBe('relevance');
			expect(result.violations[0].metric).toBe('avg');
			expect(result.violations[0].expected).toBe(0.8);
			expect(result.violations[0].actual).toBe(0.75);
			expect(result.violations[0].message).toContain('avg score 0.750 < threshold 0.800');
		});

		it('should validate min threshold', () => {
			const report = createMockReport({
				accuracy: { avg: 0.9, min: 0.4, max: 1.0, p50: 0.9, p95: 0.98 },
			});

			const thresholds: ThresholdConfig = {
				accuracy: { min: 0.5 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations[0].metric).toBe('min');
			expect(result.violations[0].message).toContain('min score 0.400 < threshold 0.500');
		});

		it('should validate max threshold', () => {
			const report = createMockReport({
				score: { avg: 0.85, min: 0.7, max: 0.92, p50: 0.85, p95: 0.9 },
			});

			const thresholds: ThresholdConfig = {
				score: { max: 0.95 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations[0].metric).toBe('max');
		});

		it('should validate p50 threshold', () => {
			const report = createMockReport({
				'median-score': { avg: 0.85, min: 0.7, max: 0.95, p50: 0.78, p95: 0.92 },
			});

			const thresholds: ThresholdConfig = {
				'median-score': { p50: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations[0].metric).toBe('p50');
			expect(result.violations[0].actual).toBe(0.78);
		});

		it('should validate p95 threshold', () => {
			const report = createMockReport({
				'tail-score': { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.88 },
			});

			const thresholds: ThresholdConfig = {
				'tail-score': { p95: 0.9 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations[0].metric).toBe('p95');
		});

		it('should validate multiple metrics for single evaluator', () => {
			const report = createMockReport({
				quality: { avg: 0.85, min: 0.6, max: 0.95, p50: 0.85, p95: 0.92 },
			});

			const thresholds: ThresholdConfig = {
				quality: { avg: 0.8, min: 0.7, p95: 0.9 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations).toHaveLength(1); // Only first violation returned
			expect(result.violations[0].metric).toBe('min');
		});
	});

	describe('Pass Rate Thresholds', () => {
		it('should pass when pass rate meets threshold', () => {
			const report = createMockReport({
				relevance: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92 },
			});

			// 8 out of 10 items score >= 0.7 (80% pass rate)
			report.items[0].evaluations.relevance.score = 0.8;
			report.items[1].evaluations.relevance.score = 0.8;
			report.items[2].evaluations.relevance.score = 0.8;
			report.items[3].evaluations.relevance.score = 0.8;
			report.items[4].evaluations.relevance.score = 0.8;
			report.items[5].evaluations.relevance.score = 0.8;
			report.items[6].evaluations.relevance.score = 0.8;
			report.items[7].evaluations.relevance.score = 0.8;
			report.items[8].evaluations.relevance.score = 0.4; // Fail
			report.items[9].evaluations.relevance.score = 0.5; // Fail

			const thresholds: ThresholdConfig = {
				relevance: { passRate: 0.7, minScore: 0.7 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(true);
		});

		it('should fail when pass rate below threshold', () => {
			const report = createMockReport({
				relevance: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92 },
			});

			// Only 6 out of 10 items score >= 0.8 (60% pass rate)
			for (let i = 0; i < 10; i++) {
				report.items[i].evaluations.relevance.score = i < 6 ? 0.85 : 0.5;
			}

			const thresholds: ThresholdConfig = {
				relevance: { passRate: 0.8, minScore: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations).toHaveLength(1);
			expect(result.violations[0].metric).toBe('passRate');
			expect(result.violations[0].expected).toBe(0.8);
			expect(result.violations[0].actual).toBe(0.6);
			expect(result.violations[0].message).toContain('pass rate 60.0% (6/10) < threshold 80.0%');
		});

		it('should use default minScore of 0.5 if not specified', () => {
			const report = createMockReport({
				score: { avg: 0.7, min: 0.3, max: 0.9, p50: 0.7, p95: 0.85 },
			});

			// 7 out of 10 items score >= 0.5
			for (let i = 0; i < 10; i++) {
				report.items[i].evaluations.score.score = i < 7 ? 0.6 : 0.4;
			}

			const thresholds: ThresholdConfig = {
				score: { passRate: 0.6 }, // No minScore specified
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(true);
			expect(result.violations).toHaveLength(0);
		});

		it('should combine score threshold and pass rate threshold', () => {
			const report = createMockReport({
				combined: { avg: 0.85, min: 0.5, max: 0.95, p50: 0.85, p95: 0.92 },
			});

			for (let i = 0; i < 10; i++) {
				report.items[i].evaluations.combined.score = i < 9 ? 0.85 : 0.4;
			}

			const thresholds: ThresholdConfig = {
				combined: { avg: 0.8, passRate: 0.9, minScore: 0.7 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(true); // avg passes, passRate passes (9/10 = 90%)
		});
	});

	describe('Multiple Evaluators', () => {
		it('should validate thresholds for multiple evaluators', () => {
			const report = createMockReport({
				relevance: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92 },
				accuracy: { avg: 0.9, min: 0.8, max: 0.98, p50: 0.9, p95: 0.95 },
				fluency: { avg: 0.75, min: 0.6, max: 0.9, p50: 0.75, p95: 0.85 },
			});

			const thresholds: ThresholdConfig = {
				relevance: { avg: 0.8 },
				accuracy: { avg: 0.85 },
				fluency: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations).toHaveLength(1); // fluency fails
			expect(result.violations[0].evaluator).toBe('fluency');
		});

		it('should report all failing evaluators', () => {
			const report = createMockReport({
				eval1: { avg: 0.6, min: 0.5, max: 0.7, p50: 0.6, p95: 0.65 },
				eval2: { avg: 0.65, min: 0.5, max: 0.8, p50: 0.65, p95: 0.75 },
				eval3: { avg: 0.9, min: 0.8, max: 0.95, p50: 0.9, p95: 0.93 },
			});

			const thresholds: ThresholdConfig = {
				eval1: { avg: 0.7 },
				eval2: { avg: 0.7 },
				eval3: { avg: 0.85 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations).toHaveLength(2); // eval1 and eval2 fail
		});
	});

	describe('Edge Cases', () => {
		it('should fail if evaluator not found in results', () => {
			const report = createMockReport({
				relevance: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92 },
			});

			const thresholds: ThresholdConfig = {
				nonexistent: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations).toHaveLength(1);
			expect(result.violations[0].evaluator).toBe('nonexistent');
			expect(result.violations[0].metric).toBe('existence');
			expect(result.violations[0].message).toContain('not found in results');
		});

		it('should pass with empty threshold config', () => {
			const report = createMockReport({
				relevance: { avg: 0.5, min: 0.3, max: 0.7, p50: 0.5, p95: 0.65 },
			});

			const thresholds: ThresholdConfig = {};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(true);
			expect(result.violations).toHaveLength(0);
			expect(result.summary).toContain('All thresholds passed (0 evaluators checked)');
		});

		it('should handle exact threshold values (boundary test)', () => {
			const report = createMockReport({
				exact: { avg: 0.8, min: 0.7, max: 0.9, p50: 0.8, p95: 0.85 },
			});

			const thresholds: ThresholdConfig = {
				exact: { avg: 0.8, min: 0.7, p50: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(true); // Exact match should pass
		});

		it('should handle very small differences correctly', () => {
			const report = createMockReport({
				precision: { avg: 0.7999999, min: 0.7, max: 0.9, p50: 0.8, p95: 0.85 },
			});

			const thresholds: ThresholdConfig = {
				precision: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.passed).toBe(false);
			expect(result.violations[0].actual).toBe(0.7999999);
		});
	});

	describe('Summary Messages', () => {
		it('should provide clear summary for passing case', () => {
			const report = createMockReport({
				eval1: { avg: 0.9, min: 0.8, max: 0.95, p50: 0.9, p95: 0.93 },
				eval2: { avg: 0.85, min: 0.7, max: 0.9, p50: 0.85, p95: 0.88 },
			});

			const thresholds: ThresholdConfig = {
				eval1: { avg: 0.8 },
				eval2: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.summary).toBe('All thresholds passed (2 evaluators checked)');
		});

		it('should provide clear summary for failing case', () => {
			const report = createMockReport({
				eval1: { avg: 0.7, min: 0.6, max: 0.8, p50: 0.7, p95: 0.75 },
				eval2: { avg: 0.65, min: 0.5, max: 0.8, p50: 0.65, p95: 0.75 },
			});

			const thresholds: ThresholdConfig = {
				eval1: { avg: 0.8 },
				eval2: { avg: 0.8 },
			};

			const result = validateThresholds(report, thresholds);

			expect(result.summary).toContain('2 threshold violation(s) detected');
		});
	});
});
