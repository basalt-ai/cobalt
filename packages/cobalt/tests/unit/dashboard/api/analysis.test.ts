import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExperimentReport } from '../../../../src/types/index.js'

// Mock storage
vi.mock('../../../../src/storage/results.js', () => ({
	loadResult: vi.fn(),
}))

// Mock fs operations for cache
vi.mock('node:fs', () => ({
	existsSync: vi.fn(() => false),
}))

vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdir: vi.fn(),
}))

// Mock AI SDK
vi.mock('ai', () => ({
	generateText: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: vi.fn(() => vi.fn(() => 'openai-model')),
}))

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: vi.fn(() => vi.fn(() => 'anthropic-model')),
}))

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { generateText } from 'ai'
import {
	createCompareAnalysisHandler,
	createRunAnalysisHandler,
} from '../../../../src/dashboard/api/analysis.js'
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
		],
		...overrides,
	}
}

function createMockContext(
	options: { params?: Record<string, string>; query?: Record<string, string> } = {},
) {
	return {
		req: {
			param: (key: string) => options.params?.[key] ?? '',
			query: () => options.query ?? {},
		},
		json: vi.fn((data: unknown, status?: number) => ({ data, status })),
	}
}

describe('Analysis API', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createRunAnalysisHandler', () => {
		it('should return 400 when chat is not configured', async () => {
			const handler = createRunAnalysisHandler(undefined)
			const c = createMockContext({ params: { id: 'run-1' } })

			const result = await handler(c as never)

			expect(result.status).toBe(400)
			expect((result as never).data.error).toContain('Chat not configured')
		})

		it('should return cached analysis when available', async () => {
			vi.mocked(existsSync).mockReturnValue(true)
			vi.mocked(readFile).mockResolvedValue(
				JSON.stringify({ analysis: 'cached result', timestamp: Date.now() }),
			)

			const handler = createRunAnalysisHandler({ provider: 'openai' })
			const c = createMockContext({ params: { id: 'run-1' } })

			const result = await handler(c as never)

			expect(c.json).toHaveBeenCalledWith({ analysis: 'cached result' })
			expect(generateText).not.toHaveBeenCalled()
		})

		it('should skip expired cache and generate new analysis', async () => {
			// Return true for cache file check, then false for mkdir check
			vi.mocked(existsSync).mockReturnValueOnce(true).mockReturnValue(false)
			vi.mocked(readFile).mockResolvedValue(
				JSON.stringify({ analysis: 'old result', timestamp: Date.now() - 25 * 60 * 60 * 1000 }),
			)
			vi.mocked(generateText).mockResolvedValue({ text: 'new analysis' } as never)
			vi.mocked(loadResult).mockResolvedValue(createMockReport())

			const handler = createRunAnalysisHandler({ provider: 'openai' })
			const c = createMockContext({ params: { id: 'run-1' } })

			const result = await handler(c as never)

			expect(generateText).toHaveBeenCalled()
			expect(c.json).toHaveBeenCalledWith({ analysis: 'new analysis' })
		})

		it('should generate and cache analysis on cache miss', async () => {
			vi.mocked(existsSync).mockReturnValue(false)
			vi.mocked(generateText).mockResolvedValue({ text: 'generated analysis' } as never)
			vi.mocked(loadResult).mockResolvedValue(createMockReport())

			const handler = createRunAnalysisHandler({ provider: 'openai' })
			const c = createMockContext({ params: { id: 'run-1' } })

			await handler(c as never)

			expect(generateText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining('experiment'),
					prompt: expect.stringContaining('Analyze'),
				}),
			)
			expect(c.json).toHaveBeenCalledWith({ analysis: 'generated analysis' })
		})
	})

	describe('createCompareAnalysisHandler', () => {
		it('should return 400 when chat is not configured', async () => {
			const handler = createCompareAnalysisHandler(undefined)
			const c = createMockContext({ query: { a: 'run-a', b: 'run-b' } })

			const result = await handler(c as never)

			expect(result.status).toBe(400)
			expect((result as never).data.error).toContain('Chat not configured')
		})

		it('should return 400 when missing run IDs', async () => {
			const handler = createCompareAnalysisHandler({ provider: 'openai' })
			const c = createMockContext({ query: { a: 'run-a' } })

			const result = await handler(c as never)

			expect(result.status).toBe(400)
			expect((result as never).data.error).toContain('Missing run IDs')
		})

		it('should generate comparison analysis', async () => {
			vi.mocked(existsSync).mockReturnValue(false)
			vi.mocked(generateText).mockResolvedValue({ text: 'comparison result' } as never)
			vi.mocked(loadResult)
				.mockResolvedValueOnce(createMockReport({ id: 'run-a', name: 'exp-a' }))
				.mockResolvedValueOnce(createMockReport({ id: 'run-b', name: 'exp-b' }))

			const handler = createCompareAnalysisHandler({ provider: 'openai' })
			const c = createMockContext({ query: { a: 'run-a', b: 'run-b' } })

			await handler(c as never)

			expect(generateText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining('comparing'),
					prompt: expect.stringContaining('Compare'),
				}),
			)
			expect(c.json).toHaveBeenCalledWith({ analysis: 'comparison result' })
		})
	})
})
