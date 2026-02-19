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
	it('should generate score table without comparison', () => {
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
		expect(body).toContain('**accuracy**')
		expect(body).toContain('avg')
		expect(body).toContain('0.85')
		expect(body).toContain('10 items')
		expect(body).toContain('12.5s')
		expect(body).not.toContain('vs Previous')
		expect(body).not.toContain('Threshold')
	})

	it('should show all metrics as rows for each evaluator', () => {
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

		// All 5 metrics should appear as rows with bold metric names
		expect(body).toContain('| **accuracy** | **avg** |')
		expect(body).toContain('|  | **p50** |')
		expect(body).toContain('|  | **p95** |')
		expect(body).toContain('|  | **min** |')
		expect(body).toContain('|  | **max** |')
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

	it('should show green header emoji when CI passes', () => {
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
						checks: [
							{
								category: 'accuracy',
								metric: 'avg',
								expected: 0.8,
								actual: 0.85,
								passed: true,
								message: 'accuracy: avg 0.850 >= threshold 0.800',
							},
						],
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

		expect(body).toContain('## 🟢 Cobalt Experiment Results')
		expect(body).toContain('🟢')
		expect(body).toContain('Threshold')
		expect(body).toContain('Message')
	})

	it('should show red header emoji and violation rows when CI fails', () => {
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
						checks: [
							{
								category: 'accuracy',
								metric: 'avg',
								expected: 0.7,
								actual: 0.45,
								passed: false,
								message: 'accuracy: avg 0.450 < threshold 0.700',
							},
						],
						violations: [
							{
								category: 'accuracy',
								metric: 'avg',
								expected: 0.7,
								actual: 0.45,
								message: 'accuracy: avg 0.450 < threshold 0.700',
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

		expect(body).toContain('## 🔴 Cobalt Experiment Results')
		expect(body).toContain('🔴')
		expect(body).toContain('≥ 0.70')
		// Failed row should have message and bold score
		expect(body).toContain('**0.45**')
		expect(body).toContain('accuracy: avg 0.450 < threshold 0.700')
	})

	it('should show merged CI table with threshold checks per metric', () => {
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
						checks: [
							{
								category: 'accuracy',
								metric: 'avg',
								expected: 0.8,
								actual: 0.85,
								passed: true,
								message: 'accuracy: avg 0.850 >= threshold 0.800',
							},
							{
								category: 'accuracy',
								metric: 'p95',
								expected: 0.85,
								actual: 0.92,
								passed: true,
								message: 'accuracy: p95 0.920 >= threshold 0.850',
							},
						],
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

		// avg row should have threshold (bold metric, Message column empty for pass)
		expect(body).toContain('| 🟢 | **accuracy** | **avg** | 0.85 | ≥ 0.80 |  |')
		// p50 has no threshold
		expect(body).toContain('|  |  | **p50** | 0.85 | — |  |')
		// p95 has threshold
		expect(body).toContain('| 🟢 |  | **p95** | 0.92 | ≥ 0.85 |  |')
		// min has no threshold
		expect(body).toContain('|  |  | **min** | 0.70 | — |  |')
		// max has no threshold
		expect(body).toContain('|  |  | **max** | 0.95 | — |  |')
	})

	it('should show AI summary prominently, not in collapsible', () => {
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

		expect(body).toContain('🤖 **AI Analysis**')
		expect(body).toContain('This experiment shows strong results.')
		expect(body).not.toContain('<details>')
		expect(body).not.toContain('> This experiment')
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

	it('should show performance table with latency stats from items', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'perf-test',
				current: makeReport({
					name: 'perf-test',
					summary: {
						totalItems: 4,
						totalDurationMs: 8000,
						avgLatencyMs: 2000,
						scores: {},
					},
					items: [
						{ index: 0, input: {}, output: {}, latencyMs: 1000, evaluations: {}, runs: [] },
						{ index: 1, input: {}, output: {}, latencyMs: 1500, evaluations: {}, runs: [] },
						{ index: 2, input: {}, output: {}, latencyMs: 2000, evaluations: {}, runs: [] },
						{ index: 3, input: {}, output: {}, latencyMs: 3500, evaluations: {}, runs: [] },
					],
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('#### ⚡ Performance')
		expect(body).toContain('Latency')
		expect(body).toContain('1.0s') // min
		expect(body).toContain('3.5s') // max
	})

	it('should show tokens in performance table when available', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'test',
				current: makeReport({
					name: 'test',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						totalTokens: 5000,
						scores: {},
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		expect(body).toContain('Tokens')
		expect(body).toContain('500 /item')
		expect(body).toContain('5,000 total')
	})

	it('should show non-evaluator CI checks (latency, cost)', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'ci-test',
				current: makeReport({
					name: 'ci-test',
					summary: {
						totalItems: 10,
						totalDurationMs: 5000,
						avgLatencyMs: 500,
						scores: {},
					},
					ciStatus: {
						passed: true,
						checks: [
							{
								category: 'latency',
								metric: 'avg',
								expected: 2000,
								actual: 500,
								passed: true,
								message: 'latency: avg 500 >= threshold 2000',
							},
						],
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

		expect(body).toContain('🟢')
		expect(body).toContain('**latency**')
	})

	it('should always show tokens row in performance table', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'test',
				current: makeReport({
					name: 'test',
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

		const body = generateCommentBody(comparisons, { showCIStatus: false })

		// Tokens row should appear even without token data
		expect(body).toContain('| Tokens |')
	})

	it('should fall back to classic table when CI has no checks', () => {
		const comparisons: ExperimentComparison[] = [
			{
				experimentName: 'test',
				current: makeReport({
					name: 'test',
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
						checks: [],
						violations: [],
						summary: 'No thresholds configured',
					},
				}),
				diffs: [],
				improvements: 0,
				regressions: 0,
			},
		]

		const body = generateCommentBody(comparisons, { showCIStatus: true })

		// Should use classic table format (no Threshold column)
		expect(body).not.toContain('Threshold')
		expect(body).toContain('**accuracy**')
	})
})
