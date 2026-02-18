import { describe, expect, it } from 'vitest'
import { generateCommentBody } from '../src/markdown'
import type { ExperimentComparison, ExperimentReport } from '../src/types'

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

describe('generateCommentBody', () => {
	it('should generate basic table without comparison', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'my-experiment',
				current: makeReport({
					name: 'my-experiment',
					summary: {
						totalItems: 10,
						totalDurationMs: 12500,
						avgLatencyMs: 1250,
						scores: {
							accuracy: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92, p99: 0.95 },
						},
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('## Cobalt Experiment Results')
		expect(body).toContain('### my-experiment')
		expect(body).toContain('| **accuracy** | 0.85 | 0.85 | 0.92 | 0.70 | 0.95 |')
		expect(body).toContain('10 items')
		expect(body).toContain('12.5s')
		expect(body).not.toContain('vs Previous')
	})

	it('should include comparison column when previous exists', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'my-experiment',
				current: makeReport({
					name: 'my-experiment',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						scores: {
							accuracy: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92, p99: 0.95 },
						},
					},
				}),
				previous: makeReport({
					name: 'my-experiment',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						scores: {
							accuracy: { avg: 0.7, min: 0.5, max: 0.9, p50: 0.7, p95: 0.85, p99: 0.9 },
						},
					},
				}),
				diffs: [
					{
						evaluator: 'accuracy',
						baselineAvg: 0.7,
						candidateAvg: 0.85,
						diff: 0.15,
						percentChange: 21.4,
						direction: 'improved',
					},
				],
				improvements: 1,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('vs Previous')
		expect(body).toContain('🟢')
		expect(body).toContain('↑')
		expect(body).toContain('1 improved')
	})

	it('should show regression indicators', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'test',
				current: makeReport({
					name: 'test',
					summary: {
						totalItems: 5,
						totalDurationMs: 2000,
						avgLatencyMs: 400,
						scores: {
							quality: { avg: 0.6, min: 0.3, max: 0.8, p50: 0.6, p95: 0.75, p99: 0.8 },
						},
					},
				}),
				previous: makeReport({
					name: 'test',
					summary: {
						totalItems: 5,
						totalDurationMs: 2000,
						avgLatencyMs: 400,
						scores: {
							quality: { avg: 0.8, min: 0.6, max: 0.95, p50: 0.8, p95: 0.9, p99: 0.95 },
						},
					},
				}),
				diffs: [
					{
						evaluator: 'quality',
						baselineAvg: 0.8,
						candidateAvg: 0.6,
						diff: -0.2,
						percentChange: -25,
						direction: 'regressed',
					},
				],
				improvements: 0,
				regressions: 1,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('🔴')
		expect(body).toContain('↓')
		expect(body).toContain('1 regressed')
	})

	it('should include CI status when enabled and present', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'ci-test',
				current: makeReport({
					name: 'ci-test',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						scores: {
							accuracy: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92, p99: 0.95 },
						},
					},
					ciStatus: {
						passed: true,
						violations: [],
						summary: 'All thresholds passed',
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: true })

		expect(body).toContain('All thresholds passed')
	})

	it('should show CI violations in table', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'ci-test',
				current: makeReport({
					name: 'ci-test',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						scores: {
							accuracy: { avg: 0.45, min: 0.2, max: 0.7, p50: 0.45, p95: 0.65, p99: 0.7 },
						},
					},
					ciStatus: {
						passed: false,
						violations: [
							{
								category: 'score',
								metric: 'avg',
								expected: 0.7,
								actual: 0.45,
								message: 'Average score 0.45 below threshold 0.7',
							},
						],
						summary: '1 threshold violation',
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: true })

		expect(body).toContain('CI Status: FAILED')
		expect(body).toContain('Average score 0.45 below threshold 0.7')
	})

	it('should include AI summary in collapsible section', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'ai-test',
				current: makeReport({
					name: 'ai-test',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						scores: {},
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const aiSummaries = new Map<string, string>()
		aiSummaries.set('ai-test', 'This experiment shows strong results.')

		const body = generateCommentBody(comparisons, {
			showCIStatus: false,
			aiSummaries,
		})

		expect(body).toContain('<details>')
		expect(body).toContain('AI Analysis')
		expect(body).toContain('This experiment shows strong results.')
	})

	it('should handle multiple experiments', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'exp-1',
				current: makeReport({
					name: 'exp-1',
					summary: {
						totalItems: 5,
						totalDurationMs: 2000,
						avgLatencyMs: 400,
						scores: {
							accuracy: { avg: 0.8, min: 0.6, max: 0.95, p50: 0.8, p95: 0.9, p99: 0.95 },
						},
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
			{
				experimentName: 'exp-2',
				current: makeReport({
					name: 'exp-2',
					summary: {
						totalItems: 8,
						totalDurationMs: 3000,
						avgLatencyMs: 375,
						scores: {
							relevance: { avg: 0.9, min: 0.7, max: 1.0, p50: 0.9, p95: 0.95, p99: 1.0 },
						},
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('### exp-1')
		expect(body).toContain('### exp-2')
		expect(body).toContain('**accuracy**')
		expect(body).toContain('**relevance**')
	})

	it('should include footer', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'test',
				current: makeReport({ name: 'test' }),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('Generated with [Cobalt]')
	})

	it('should show cost and tokens when available', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'test',
				current: makeReport({
					name: 'test',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						estimatedCost: 0.0325,
						totalTokens: 15000,
						scores: {},
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('$0.0325')
		expect(body).toContain('15,000 tokens')
	})
})
