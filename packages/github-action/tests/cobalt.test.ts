import { describe, expect, it } from 'vitest'
import type { ExperimentReport, JsonEvent } from '../src/types'

/**
 * Test the JSON line parsing logic extracted from cobalt.ts.
 * Since the actual runCobalt function spawns a subprocess, we test
 * the parsing logic in isolation.
 */

function tryParseJsonEvent(line: string): JsonEvent | null {
	try {
		const parsed = JSON.parse(line) as Record<string, unknown>
		if (typeof parsed.type === 'string' && 'data' in parsed) {
			return parsed as unknown as JsonEvent
		}
		return null
	} catch {
		return null
	}
}

function parseJsonLines(output: string): ExperimentReport[] {
	const reports: ExperimentReport[] = []
	const lines = output.split('\n')

	for (const line of lines) {
		const trimmed = line.trim()
		if (!trimmed) continue

		const event = tryParseJsonEvent(trimmed)
		if (!event) continue

		if (event.type === 'experiment_complete') {
			reports.push(event.data.report)
		}
	}

	return reports
}

const sampleReport: ExperimentReport = {
	id: 'abc123',
	name: 'test-experiment',
	timestamp: '2026-01-01T00:00:00.000Z',
	tags: ['tag1'],
	config: {
		runs: 1,
		concurrency: 5,
		timeout: 30000,
		evaluators: ['accuracy'],
	},
	summary: {
		totalItems: 10,
		totalDurationMs: 5000,
		avgLatencyMs: 500,
		scores: {
			accuracy: { avg: 0.85, min: 0.7, max: 0.95, p50: 0.85, p95: 0.92, p99: 0.95 },
		},
	},
	items: [],
}

describe('JSON line parsing', () => {
	it('should parse experiment_complete events', () => {
		const line = JSON.stringify({
			type: 'experiment_complete',
			timestamp: '2026-01-01T00:00:00.000Z',
			data: { report: sampleReport, resultPath: '/tmp/results.json' },
		})

		const reports = parseJsonLines(line)

		expect(reports).toHaveLength(1)
		expect(reports[0]?.name).toBe('test-experiment')
		expect(reports[0]?.summary.scores.accuracy?.avg).toBe(0.85)
	})

	it('should skip non-JSON lines', () => {
		const output = [
			'\n🔷 Cobalt\n',
			'Found 1 experiment file(s)',
			'',
			JSON.stringify({
				type: 'experiment_start',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { name: 'test' },
			}),
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { report: sampleReport, resultPath: '/tmp/results.json' },
			}),
			'✅ All experiments completed!',
		].join('\n')

		const reports = parseJsonLines(output)

		expect(reports).toHaveLength(1)
		expect(reports[0]?.name).toBe('test-experiment')
	})

	it('should handle multiple experiment_complete events', () => {
		const report2: ExperimentReport = {
			...sampleReport,
			id: 'def456',
			name: 'second-experiment',
		}

		const output = [
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { report: sampleReport, resultPath: '/tmp/a.json' },
			}),
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: '2026-01-01T00:00:01.000Z',
				data: { report: report2, resultPath: '/tmp/b.json' },
			}),
		].join('\n')

		const reports = parseJsonLines(output)

		expect(reports).toHaveLength(2)
		expect(reports[0]?.name).toBe('test-experiment')
		expect(reports[1]?.name).toBe('second-experiment')
	})

	it('should ignore progress and other event types', () => {
		const output = [
			JSON.stringify({
				type: 'experiment_start',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { name: 'test' },
			}),
			JSON.stringify({
				type: 'progress',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { completedExecutions: 5, totalExecutions: 10 },
			}),
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { report: sampleReport, resultPath: '/tmp/r.json' },
			}),
		].join('\n')

		const reports = parseJsonLines(output)

		expect(reports).toHaveLength(1)
	})

	it('should handle empty output', () => {
		expect(parseJsonLines('')).toHaveLength(0)
		expect(parseJsonLines('\n\n\n')).toHaveLength(0)
	})

	it('should handle malformed JSON gracefully', () => {
		const output = [
			'{ broken json',
			'not json at all',
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { report: sampleReport, resultPath: '/tmp/r.json' },
			}),
		].join('\n')

		const reports = parseJsonLines(output)

		expect(reports).toHaveLength(1)
	})

	it('should reject JSON objects without type field', () => {
		const output = [
			JSON.stringify({ foo: 'bar', data: {} }),
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: '2026-01-01T00:00:00.000Z',
				data: { report: sampleReport, resultPath: '/tmp/r.json' },
			}),
		].join('\n')

		const reports = parseJsonLines(output)

		expect(reports).toHaveLength(1)
	})
})
