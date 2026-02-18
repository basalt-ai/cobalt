import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExperimentReport } from '../../../../src/types/index.js'

// Mock the storage/results module
vi.mock('../../../../src/storage/results.js', () => ({
	loadResult: vi.fn(),
}))

import { compareRuns } from '../../../../src/dashboard/api/compare.js'
import { loadResult } from '../../../../src/storage/results.js'

function createMockReport(overrides: Partial<ExperimentReport> = {}): ExperimentReport {
	return {
		id: 'run-1',
		name: 'test-experiment',
		timestamp: '2024-01-01T00:00:00.000Z',
		tags: [],
		config: { runs: 1, concurrency: 5, timeout: 30000, evaluators: ['relevance'] },
		summary: {
			totalItems: 2,
			totalDurationMs: 1000,
			avgLatencyMs: 500,
			scores: {
				relevance: { avg: 0.9, min: 0.8, max: 1.0, p50: 0.9, p95: 1.0 },
			},
		},
		items: [
			{
				index: 0,
				input: { input: 'q1' },
				output: { output: 'a1' },
				latencyMs: 100,
				evaluations: { relevance: { score: 0.9, reason: 'good' } },
				runs: [
					{
						output: { output: 'a1' },
						latencyMs: 100,
						evaluations: { relevance: { score: 0.9, reason: 'good' } },
					},
				],
			},
			{
				index: 1,
				input: { input: 'q2' },
				output: { output: 'a2' },
				latencyMs: 200,
				evaluations: { relevance: { score: 0.8, reason: 'ok' } },
				runs: [
					{
						output: { output: 'a2' },
						latencyMs: 200,
						evaluations: { relevance: { score: 0.8, reason: 'ok' } },
					},
				],
			},
		],
		...overrides,
	}
}

/**
 * Create a minimal Hono-like Context mock
 */
function createMockContext(query: Record<string, string> = {}) {
	let responseData: unknown
	let responseStatus: number | undefined

	return {
		req: {
			query: () => query,
		},
		json: (data: unknown, status?: number) => {
			responseData = data
			responseStatus = status
			return { data, status }
		},
		getResponse: () => ({ data: responseData, status: responseStatus }),
	}
}

describe('compareRuns', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('parameter validation', () => {
		it('should return 400 when missing run IDs', async () => {
			const c = createMockContext({})

			const result = await compareRuns(c as unknown)

			expect(result.status).toBe(400)
			expect(result.data.error).toContain('Missing run IDs')
		})

		it('should return 400 when only run a is provided', async () => {
			const c = createMockContext({ a: 'run-1' })

			const result = await compareRuns(c as unknown)

			expect(result.status).toBe(400)
		})
	})

	describe('two-run comparison', () => {
		it('should compare two runs and return correct structure', async () => {
			const reportA = createMockReport({ id: 'run-a', name: 'exp-a' })
			const reportB = createMockReport({
				id: 'run-b',
				name: 'exp-b',
				summary: {
					totalItems: 2,
					totalDurationMs: 900,
					avgLatencyMs: 450,
					scores: {
						relevance: { avg: 0.95, min: 0.9, max: 1.0, p50: 0.95, p95: 1.0 },
					},
				},
			})

			vi.mocked(loadResult).mockResolvedValueOnce(reportA).mockResolvedValueOnce(reportB)

			const c = createMockContext({ a: 'run-a', b: 'run-b' })
			const result = await compareRuns(c as unknown)

			expect(result.data.runs).toHaveLength(2)
			expect(result.data.runs[0].id).toBe('run-a')
			expect(result.data.runs[1].id).toBe('run-b')
		})

		it('should calculate score diffs relative to first run (baseline)', async () => {
			const reportA = createMockReport({
				id: 'run-a',
				summary: {
					totalItems: 2,
					totalDurationMs: 1000,
					avgLatencyMs: 500,
					scores: {
						relevance: { avg: 0.8, min: 0.7, max: 0.9, p50: 0.8, p95: 0.9 },
					},
				},
			})
			const reportB = createMockReport({
				id: 'run-b',
				summary: {
					totalItems: 2,
					totalDurationMs: 900,
					avgLatencyMs: 450,
					scores: {
						relevance: { avg: 0.95, min: 0.9, max: 1.0, p50: 0.95, p95: 1.0 },
					},
				},
			})

			vi.mocked(loadResult).mockResolvedValueOnce(reportA).mockResolvedValueOnce(reportB)

			const c = createMockContext({ a: 'run-a', b: 'run-b' })
			const result = await compareRuns(c as unknown)

			const scoreDiffs = result.data.scoreDiffs
			expect(scoreDiffs.relevance.scores).toEqual([0.8, 0.95])
			expect(scoreDiffs.relevance.diffs[0]).toBe(0) // baseline diff is 0
			expect(scoreDiffs.relevance.diffs[1]).toBeCloseTo(0.15) // 0.95 - 0.8
		})

		it('should include item-level comparison', async () => {
			const reportA = createMockReport({ id: 'run-a' })
			const reportB = createMockReport({ id: 'run-b' })

			vi.mocked(loadResult).mockResolvedValueOnce(reportA).mockResolvedValueOnce(reportB)

			const c = createMockContext({ a: 'run-a', b: 'run-b' })
			const result = await compareRuns(c as unknown)

			expect(result.data.items).toHaveLength(2)
			expect(result.data.items[0].outputs).toHaveLength(2)
			expect(result.data.items[0].outputs[0].output).toEqual({ output: 'a1' })
		})
	})

	describe('three-run comparison', () => {
		it('should support comparing three runs', async () => {
			const reportA = createMockReport({ id: 'run-a' })
			const reportB = createMockReport({ id: 'run-b' })
			const reportC = createMockReport({ id: 'run-c' })

			vi.mocked(loadResult)
				.mockResolvedValueOnce(reportA)
				.mockResolvedValueOnce(reportB)
				.mockResolvedValueOnce(reportC)

			const c = createMockContext({ a: 'run-a', b: 'run-b', c: 'run-c' })
			const result = await compareRuns(c as unknown)

			expect(result.data.runs).toHaveLength(3)
			expect(result.data.items[0].outputs).toHaveLength(3)
		})
	})

	describe('mismatched data', () => {
		it('should handle runs with different item counts', async () => {
			const reportA = createMockReport({ id: 'run-a' })
			const reportB = createMockReport({
				id: 'run-b',
				items: [
					{
						index: 0,
						input: { input: 'q1' },
						output: { output: 'b1' },
						latencyMs: 150,
						evaluations: { relevance: { score: 0.95, reason: 'great' } },
						runs: [
							{
								output: { output: 'b1' },
								latencyMs: 150,
								evaluations: { relevance: { score: 0.95, reason: 'great' } },
							},
						],
					},
				],
			})

			vi.mocked(loadResult).mockResolvedValueOnce(reportA).mockResolvedValueOnce(reportB)

			const c = createMockContext({ a: 'run-a', b: 'run-b' })
			const result = await compareRuns(c as unknown)

			// Should have 2 items (max of both runs)
			expect(result.data.items).toHaveLength(2)
			// Second item should have null for run B
			expect(result.data.items[1].outputs[1]).toBeNull()
		})

		it('should handle runs with different evaluators', async () => {
			const reportA = createMockReport({
				id: 'run-a',
				summary: {
					totalItems: 1,
					totalDurationMs: 500,
					avgLatencyMs: 500,
					scores: {
						relevance: { avg: 0.9, min: 0.9, max: 0.9, p50: 0.9, p95: 0.9 },
					},
				},
			})
			const reportB = createMockReport({
				id: 'run-b',
				summary: {
					totalItems: 1,
					totalDurationMs: 500,
					avgLatencyMs: 500,
					scores: {
						accuracy: { avg: 0.85, min: 0.85, max: 0.85, p50: 0.85, p95: 0.85 },
					},
				},
			})

			vi.mocked(loadResult).mockResolvedValueOnce(reportA).mockResolvedValueOnce(reportB)

			const c = createMockContext({ a: 'run-a', b: 'run-b' })
			const result = await compareRuns(c as unknown)

			// Should include both evaluator names
			expect(result.data.scoreDiffs).toHaveProperty('relevance')
			expect(result.data.scoreDiffs).toHaveProperty('accuracy')
			// Missing evaluator should show 0
			expect(result.data.scoreDiffs.relevance.scores).toEqual([0.9, 0])
			expect(result.data.scoreDiffs.accuracy.scores).toEqual([0, 0.85])
		})
	})

	describe('error handling', () => {
		it('should return 500 when loadResult fails', async () => {
			vi.mocked(loadResult).mockRejectedValueOnce(new Error('Run not found'))

			const c = createMockContext({ a: 'run-a', b: 'run-b' })
			const result = await compareRuns(c as unknown)

			expect(result.status).toBe(500)
			expect(result.data.error).toContain('Failed to compare runs')
		})
	})
})
