import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSONReporter } from '../../../../src/cli/reporters/json-reporter.js'
import type { CIResult, ExperimentReport } from '../../../../src/types/index.js'

describe('JSONReporter', () => {
	let reporter: JSONReporter
	let logSpy: ReturnType<typeof vi.spyOn>
	let errorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		reporter = new JSONReporter()
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('onStart', () => {
		it('should output valid JSON with type experiment_start', () => {
			reporter.onStart({
				name: 'test-exp',
				datasetSize: 10,
				evaluators: ['relevance'],
				concurrency: 5,
				timeout: 30000,
				runs: 1,
				tags: ['v1'],
			})

			expect(logSpy).toHaveBeenCalledTimes(1)
			const output = JSON.parse(logSpy.mock.calls[0][0])
			expect(output.type).toBe('experiment_start')
			expect(output.timestamp).toBeDefined()
			expect(output.data.name).toBe('test-exp')
			expect(output.data.datasetSize).toBe(10)
		})
	})

	describe('onProgress', () => {
		it('should output valid JSON with progress data', () => {
			reporter.onProgress({
				itemIndex: 2,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 3,
				totalExecutions: 10,
			})

			const output = JSON.parse(logSpy.mock.calls[0][0])
			expect(output.type).toBe('progress')
			expect(output.data.completedExecutions).toBe(3)
			expect(output.data.totalExecutions).toBe(10)
			expect(output.data.progress).toBe(0.3)
			expect(output.data.currentItem).toBe(3) // itemIndex + 1
			expect(output.data.currentRun).toBe(1) // runIndex + 1
		})
	})

	describe('onCIStatus', () => {
		it('should output valid JSON with CI status', () => {
			const ciStatus: CIResult = {
				passed: true,
				violations: [],
				summary: 'All thresholds passed',
			}

			reporter.onCIStatus(ciStatus)

			const output = JSON.parse(logSpy.mock.calls[0][0])
			expect(output.type).toBe('ci_status')
			expect(output.data.passed).toBe(true)
			expect(output.data.summary).toBe('All thresholds passed')
		})

		it('should include violations when CI fails', () => {
			const ciStatus: CIResult = {
				passed: false,
				violations: [
					{
						evaluator: 'relevance',
						metric: 'avg',
						expected: 0.9,
						actual: 0.7,
						message: 'Below threshold',
					},
				],
				summary: 'Thresholds failed',
			}

			reporter.onCIStatus(ciStatus)

			const output = JSON.parse(logSpy.mock.calls[0][0])
			expect(output.data.passed).toBe(false)
			expect(output.data.violations).toHaveLength(1)
			expect(output.data.violations[0].evaluator).toBe('relevance')
		})
	})

	describe('onComplete', () => {
		it('should output valid JSON with full report and result path', () => {
			const report: ExperimentReport = {
				id: 'abc123',
				name: 'test-exp',
				timestamp: '2024-01-01T00:00:00.000Z',
				tags: [],
				config: { runs: 1, concurrency: 5, timeout: 30000, evaluators: ['relevance'] },
				summary: {
					totalItems: 2,
					totalDurationMs: 1000,
					avgLatencyMs: 500,
					scores: {},
				},
				items: [],
			}

			reporter.onComplete(report, '/path/to/result.json')

			const output = JSON.parse(logSpy.mock.calls[0][0])
			expect(output.type).toBe('experiment_complete')
			expect(output.data.report.id).toBe('abc123')
			expect(output.data.resultPath).toBe('/path/to/result.json')
		})
	})

	describe('onError', () => {
		it('should output valid JSON to stderr with error details', () => {
			const error = new Error('Something failed')
			reporter.onError(error, 'loading config')

			const output = JSON.parse(errorSpy.mock.calls[0][0])
			expect(output.type).toBe('error')
			expect(output.data.message).toBe('Something failed')
			expect(output.data.context).toBe('loading config')
			expect(output.data.stack).toBeDefined()
		})

		it('should handle errors without context', () => {
			const error = new Error('Unexpected')
			reporter.onError(error)

			const output = JSON.parse(errorSpy.mock.calls[0][0])
			expect(output.data.context).toBeUndefined()
		})
	})
})
