import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExperimentReport } from '../../../../src/types/index.js'

// Mock storage
vi.mock('../../../../src/storage/results.js', () => ({
	loadResult: vi.fn(),
	listResults: vi.fn(),
}))

// Mock AI SDK
vi.mock('ai', () => ({
	streamText: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: vi.fn(() => vi.fn(() => 'openai-model')),
}))

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: vi.fn(() => vi.fn(() => 'anthropic-model')),
}))

import { streamText } from 'ai'
import {
	buildSystemPrompt,
	createChatHandler,
	formatRunContext,
} from '../../../../src/dashboard/api/chat.js'
import { listResults, loadResult } from '../../../../src/storage/results.js'

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
				evaluations: { relevance: { score: 0.4, reason: 'missed key detail' } },
				runs: [
					{
						output: { output: 'a2' },
						latencyMs: 200,
						evaluations: { relevance: { score: 0.4, reason: 'missed key detail' } },
					},
				],
			},
		],
		...overrides,
	}
}

function createMockContext(
	options: {
		body?: Record<string, unknown>
		query?: Record<string, string>
		params?: Record<string, string>
	} = {},
) {
	return {
		req: {
			json: vi.fn().mockResolvedValue(options.body ?? {}),
			query: () => options.query ?? {},
			param: (key: string) => options.params?.[key] ?? '',
		},
		json: vi.fn((data: unknown, status?: number) => ({ data, status })),
	}
}

describe('Chat API', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createChatHandler', () => {
		it('should return 400 when chat is not configured', async () => {
			const handler = createChatHandler(undefined)
			const c = createMockContext()

			const result = await handler(c as never)

			expect(result.status).toBe(400)
			expect((result as never).data.error).toContain('Chat not configured')
		})

		it('should call streamText with messages and system prompt', async () => {
			const mockStreamResult = {
				toUIMessageStreamResponse: vi.fn(() => new Response('stream')),
			}
			vi.mocked(streamText).mockReturnValue(mockStreamResult as never)

			const handler = createChatHandler({ provider: 'openai', model: 'gpt-4o-mini' })
			const c = createMockContext({
				body: {
					messages: [
						{ id: '1', role: 'user', parts: [{ type: 'text', text: 'analyze my results' }] },
					],
					context: { page: 'runs' },
				},
			})

			vi.mocked(listResults).mockResolvedValue([])

			await handler(c as never)

			expect(streamText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining('Cobalt'),
					messages: [{ role: 'user', content: 'analyze my results' }],
				}),
			)
			expect(mockStreamResult.toUIMessageStreamResponse).toHaveBeenCalled()
		})
	})

	describe('buildSystemPrompt', () => {
		it('should return base prompt when no context provided', async () => {
			const prompt = await buildSystemPrompt(undefined)
			expect(prompt).toContain('Cobalt')
			expect(prompt).toContain('AI assistant')
		})

		it('should include run data for run-detail context', async () => {
			const report = createMockReport({ id: 'run-abc', name: 'my-agent' })
			vi.mocked(loadResult).mockResolvedValue(report)

			const prompt = await buildSystemPrompt({ page: 'run-detail', runId: 'run-abc' })

			expect(prompt).toContain('run-detail')
			expect(prompt).toContain('my-agent')
			expect(prompt).toContain('relevance')
		})

		it('should include compare data for compare context', async () => {
			const reportA = createMockReport({ id: 'run-a', name: 'exp-a' })
			const reportB = createMockReport({ id: 'run-b', name: 'exp-b' })
			vi.mocked(loadResult).mockResolvedValueOnce(reportA).mockResolvedValueOnce(reportB)

			const prompt = await buildSystemPrompt({ page: 'compare', compareIds: ['run-a', 'run-b'] })

			expect(prompt).toContain('compare')
			expect(prompt).toContain('Comparing 2 runs')
		})

		it('should include experiment name for trends context', async () => {
			const prompt = await buildSystemPrompt({ page: 'trends', experiment: 'my-agent' })
			expect(prompt).toContain('trends')
			expect(prompt).toContain('my-agent')
		})

		it('should handle context loading errors gracefully', async () => {
			vi.mocked(loadResult).mockRejectedValue(new Error('Not found'))

			const prompt = await buildSystemPrompt({ page: 'run-detail', runId: 'nonexistent' })
			expect(prompt).toContain('Cobalt')
		})
	})

	describe('formatRunContext', () => {
		it('should include low-scoring items', () => {
			const report = createMockReport()
			const context = formatRunContext(report)

			expect(context).toContain('Item #2')
			expect(context).toContain('0.40')
		})

		it('should include score summary', () => {
			const report = createMockReport()
			const context = formatRunContext(report)

			expect(context).toContain('relevance')
			expect(context).toContain('avg=0.900')
		})
	})
})
