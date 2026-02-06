import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateSimilarity } from '../../../src/evaluators/similarity.js'
import type { SimilarityEvaluatorConfig } from '../../../src/types/index.js'
import { sampleEvalContext } from '../../helpers/fixtures.js'
import { createMockEmbeddingResponse } from '../../helpers/mocks.js'

// Mock the OpenAI SDK
vi.mock('openai', () => ({
	default: vi.fn().mockImplementation(() => ({
		embeddings: {
			create: vi.fn().mockResolvedValue(
				createMockEmbeddingResponse([0.1, 0.2, 0.3, 0.4, 0.5])
			)
		}
	}))
}))

describe('evaluateSimilarity', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Basic similarity calculation', () => {
		it('should calculate high similarity for similar vectors', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse([1.0, 0.5, 0.3]))
				.mockResolvedValueOnce(createMockEmbeddingResponse([0.9, 0.6, 0.2]))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			expect(result.score).toBeGreaterThan(0.8)
			expect(result.reason).toContain('Cosine similarity')
			expect(mockCreate).toHaveBeenCalledTimes(2)
		})

		it('should calculate low similarity for different vectors', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse([1.0, 0.0, 0.0]))
				.mockResolvedValueOnce(createMockEmbeddingResponse([0.0, 1.0, 0.0]))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			expect(result.score).toBeLessThan(0.2)
			expect(result.reason).toContain('Cosine similarity')
		})

		it('should handle identical vectors (perfect similarity)', async () => {
			const OpenAI = (await import('openai')).default
			const vector = [0.5, 0.5, 0.5, 0.5]
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse(vector))
				.mockResolvedValueOnce(createMockEmbeddingResponse(vector))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			expect(result.score).toBeCloseTo(1.0, 2)
			expect(result.reason).toContain('Cosine similarity')
		})
	})

	describe('Threshold mode', () => {
		it('should return 1 when similarity meets threshold', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse([1.0, 0.5, 0.3]))
				.mockResolvedValueOnce(createMockEmbeddingResponse([0.95, 0.55, 0.25]))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput',
				threshold: 0.8
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			expect(result.score).toBe(1)
			expect(result.reason).toContain('meets threshold')
			expect(result.reason).toContain('0.8')
		})

		it('should return 0 when similarity below threshold', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse([1.0, 0.0, 0.0]))
				.mockResolvedValueOnce(createMockEmbeddingResponse([0.0, 1.0, 0.0]))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput',
				threshold: 0.85
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			expect(result.score).toBe(0)
			expect(result.reason).toContain('below threshold')
			expect(result.reason).toContain('0.85')
		})
	})

	describe('Raw similarity mode', () => {
		it('should return raw similarity score when no threshold', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse([0.8, 0.6, 0.2]))
				.mockResolvedValueOnce(createMockEmbeddingResponse([0.7, 0.5, 0.3]))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			// Should return continuous value between 0 and 1
			expect(result.score).toBeGreaterThan(0)
			expect(result.score).toBeLessThan(1)
			expect(result.reason).toContain('Cosine similarity')
		})
	})

	describe('Field extraction', () => {
		it('should extract field from item', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn().mockResolvedValue(
				createMockEmbeddingResponse([0.5, 0.5, 0.5])
			)

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			// Verify it called embeddings API with the expected output field
			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'Paris'  // expectedOutput from sampleEvalContext
				})
			)
		})

		it('should throw error when field not found', async () => {
			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'nonExistentField'
			}

			await expect(
				evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')
			).rejects.toThrow('Field "nonExistentField" not found')
		})
	})

	describe('Edge cases', () => {
		it('should handle empty output text', async () => {
			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const emptyContext = {
				...sampleEvalContext,
				output: ''
			}

			const result = await evaluateSimilarity(config, emptyContext, 'fake-api-key')

			expect(result.score).toBe(0)
			expect(result.reason).toContain('Cannot calculate similarity for empty text')
		})

		it('should handle empty expected text', async () => {
			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const emptyContext = {
				...sampleEvalContext,
				item: {
					...sampleEvalContext.item,
					expectedOutput: '   '  // whitespace only
				}
			}

			const result = await evaluateSimilarity(config, emptyContext, 'fake-api-key')

			expect(result.score).toBe(0)
			expect(result.reason).toContain('Cannot calculate similarity for empty text')
		})

		it('should throw error when API key is missing', async () => {
			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			await expect(
				evaluateSimilarity(config, sampleEvalContext, undefined)
			).rejects.toThrow('OpenAI API key is required')
		})

		it('should handle API errors gracefully', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			await expect(
				evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')
			).rejects.toThrow('API rate limit exceeded')
		})
	})

	describe('Model selection', () => {
		it('should use text-embedding-3-small by default', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn().mockResolvedValue(
				createMockEmbeddingResponse([0.5, 0.5, 0.5])
			)

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'text-embedding-3-small'
				})
			)
		})
	})

	describe('Vector operations', () => {
		it('should handle zero magnitude vectors', async () => {
			const OpenAI = (await import('openai')).default
			const mockCreate = vi.fn()
				.mockResolvedValueOnce(createMockEmbeddingResponse([0, 0, 0]))
				.mockResolvedValueOnce(createMockEmbeddingResponse([1, 1, 1]))

			vi.mocked(OpenAI).mockImplementation(() => ({
				embeddings: {
					create: mockCreate
				}
			}) as any)

			const config: SimilarityEvaluatorConfig = {
				name: 'semantic-similarity',
				type: 'similarity',
				field: 'expectedOutput'
			}

			const result = await evaluateSimilarity(config, sampleEvalContext, 'fake-api-key')

			// Zero vector should result in zero similarity
			expect(result.score).toBe(0)
		})
	})
})
