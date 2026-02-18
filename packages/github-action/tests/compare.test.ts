import { describe, expect, it } from 'vitest'
import { buildComparisons, compareReports } from '../src/compare'
import type { ExperimentReport } from '../src/types'

function makeReport(overrides: Partial<ExperimentReport> & { name: string }): ExperimentReport {
	return {
		id: 'abc123',
		timestamp: '2026-01-01T00:00:00.000Z',
		tags: [],
		config: { runs: 1, concurrency: 5, timeout: 30000, evaluators: [] },
		summary: {
			totalItems: 10,
			totalDurationMs: 5000,
			avgLatencyMs: 500,
			scores: {},
		},
		items: [],
		...overrides,
	}
}

describe('compareReports', () => {
	it('should detect improvements', () => {
		const previous = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.7, min: 0.5, max: 0.9, p50: 0.7, p95: 0.85, p99: 0.9 },
				},
			},
		})

		const current = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.85, min: 0.6, max: 0.95, p50: 0.85, p95: 0.92, p99: 0.95 },
				},
			},
		})

		const result = compareReports(current, previous)

		expect(result.experimentName).toBe('test')
		expect(result.improvements).toBe(1)
		expect(result.regressions).toBe(0)
		expect(result.diffs).toHaveLength(1)
		expect(result.diffs[0]?.direction).toBe('improved')
		expect(result.diffs[0]?.diff).toBeCloseTo(0.15)
		expect(result.diffs[0]?.percentChange).toBeCloseTo(21.43, 1)
	})

	it('should detect regressions', () => {
		const previous = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					quality: { avg: 0.9, min: 0.8, max: 1.0, p50: 0.9, p95: 0.95, p99: 1.0 },
				},
			},
		})

		const current = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					quality: { avg: 0.75, min: 0.6, max: 0.9, p50: 0.75, p95: 0.85, p99: 0.9 },
				},
			},
		})

		const result = compareReports(current, previous)

		expect(result.regressions).toBe(1)
		expect(result.improvements).toBe(0)
		expect(result.diffs[0]?.direction).toBe('regressed')
		expect(result.diffs[0]?.diff).toBeCloseTo(-0.15)
	})

	it('should detect unchanged scores within threshold', () => {
		const previous = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.9, p99: 0.95 },
				},
			},
		})

		const current = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.8505, min: 0.7, max: 0.95, p50: 0.85, p95: 0.9, p99: 0.95 },
				},
			},
		})

		const result = compareReports(current, previous)

		expect(result.diffs[0]?.direction).toBe('unchanged')
		expect(result.improvements).toBe(0)
		expect(result.regressions).toBe(0)
	})

	it('should handle multiple evaluators with mixed results', () => {
		const previous = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.7, min: 0.5, max: 0.9, p50: 0.7, p95: 0.85, p99: 0.9 },
					relevance: { avg: 0.8, min: 0.6, max: 0.95, p50: 0.8, p95: 0.9, p99: 0.95 },
				},
			},
		})

		const current = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.85, min: 0.6, max: 0.95, p50: 0.85, p95: 0.92, p99: 0.95 },
					relevance: { avg: 0.65, min: 0.4, max: 0.85, p50: 0.65, p95: 0.8, p99: 0.85 },
				},
			},
		})

		const result = compareReports(current, previous)

		expect(result.improvements).toBe(1)
		expect(result.regressions).toBe(1)
		expect(result.diffs).toHaveLength(2)
	})

	it('should handle evaluators present only in current report', () => {
		const previous = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.8, min: 0.6, max: 0.95, p50: 0.8, p95: 0.9, p99: 0.95 },
				},
			},
		})

		const current = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.8, min: 0.6, max: 0.95, p50: 0.8, p95: 0.9, p99: 0.95 },
					newEval: { avg: 0.9, min: 0.7, max: 1.0, p50: 0.9, p95: 0.95, p99: 1.0 },
				},
			},
		})

		const result = compareReports(current, previous)

		// newEval: candidateAvg=0.9, baselineAvg=0 → diff=0.9 → improved
		expect(result.diffs).toHaveLength(2)
		const newEvalDiff = result.diffs.find(d => d.evaluator === 'newEval')
		expect(newEvalDiff?.direction).toBe('improved')
		expect(newEvalDiff?.baselineAvg).toBe(0)
	})

	it('should handle zero baseline without division by zero', () => {
		const previous = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 },
				},
			},
		})

		const current = makeReport({
			name: 'test',
			summary: {
				totalItems: 10,
				totalDurationMs: 5000,
				avgLatencyMs: 500,
				scores: {
					accuracy: { avg: 0.8, min: 0.6, max: 0.95, p50: 0.8, p95: 0.9, p99: 0.95 },
				},
			},
		})

		const result = compareReports(current, previous)

		expect(result.diffs[0]?.percentChange).toBe(0)
		expect(result.diffs[0]?.direction).toBe('improved')
		expect(Number.isFinite(result.diffs[0]?.percentChange)).toBe(true)
	})
})

describe('buildComparisons', () => {
	it('should match experiments by name', () => {
		const current = [
			makeReport({ name: 'exp-a', id: 'curr1' }),
			makeReport({ name: 'exp-b', id: 'curr2' }),
		]
		const previous = [
			makeReport({ name: 'exp-a', id: 'prev1' }),
			makeReport({ name: 'exp-c', id: 'prev3' }),
		]

		const comparisons = buildComparisons(current, previous)

		expect(comparisons).toHaveLength(2)
		expect(comparisons[0]?.previous).toBeDefined()
		expect(comparisons[1]?.previous).toBeUndefined()
	})

	it('should handle null previous reports', () => {
		const current = [makeReport({ name: 'exp-a' })]
		const comparisons = buildComparisons(current, null)

		expect(comparisons).toHaveLength(1)
		expect(comparisons[0]?.previous).toBeUndefined()
		expect(comparisons[0]?.diffs).toHaveLength(0)
	})
})
