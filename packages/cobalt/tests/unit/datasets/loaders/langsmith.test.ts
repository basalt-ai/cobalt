import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLangSmithDataset } from '../../../../src/datasets/loaders/langsmith.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('fetchLangSmithDataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.LANGSMITH_API_KEY;
	});

	describe('authentication', () => {
		it('should use API key from options', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [{ id: 'dataset-123', name: 'test-dataset' }],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				});

			await fetchLangSmithDataset('test-dataset', { apiKey: 'test-key' });

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'X-API-Key': 'test-key',
					}),
				}),
			);
		});

		it('should use API key from environment', async () => {
			process.env.LANGSMITH_API_KEY = 'env-key';

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [{ id: 'dataset-123' }],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				});

			await fetchLangSmithDataset('test-dataset');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'X-API-Key': 'env-key',
					}),
				}),
			);
		});

		it('should throw error if no API key provided', async () => {
			await expect(fetchLangSmithDataset('test-dataset')).rejects.toThrow(
				'LangSmith API key is required',
			);
		});
	});

	describe('data fetching', () => {
		it('should fetch and transform LangSmith dataset', async () => {
			const mockDatasets = [{ id: 'dataset-123', name: 'test-dataset' }];
			const mockExamples = [
				{
					id: 'example-1',
					inputs: { question: 'What is AI?' },
					outputs: { answer: 'Artificial Intelligence' },
					metadata: { category: 'tech' },
				},
				{
					id: 'example-2',
					inputs: { question: 'What is ML?' },
					outputs: { answer: 'Machine Learning' },
				},
			];

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => mockDatasets,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => mockExamples,
				});

			const result = await fetchLangSmithDataset('test-dataset', { apiKey: 'test-key' });

			expect(result).toHaveLength(2);
			// Single-field inputs/outputs are extracted, not stringified
			expect(result[0]).toMatchObject({
				input: 'What is AI?',
				expectedOutput: 'Artificial Intelligence',
				metadata: { category: 'tech' },
				langsmithId: 'example-1',
			});
		});

		it('should handle single input/output fields', async () => {
			const mockDatasets = [{ id: 'dataset-123' }];
			const mockExamples = [
				{
					id: 'example-1',
					inputs: { text: 'input text' },
					outputs: { result: 'output text' },
				},
			];

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => mockDatasets,
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => mockExamples,
				});

			const result = await fetchLangSmithDataset('test-dataset', { apiKey: 'test-key' });

			expect(result[0].input).toBe('input text');
			expect(result[0].expectedOutput).toBe('output text');
		});

		it('should use custom base URL', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [{ id: 'dataset-123' }],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [],
				});

			await fetchLangSmithDataset('test-dataset', {
				apiKey: 'test-key',
				baseUrl: 'https://custom.langsmith.com',
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom.langsmith.com/datasets?name=test-dataset',
				expect.any(Object),
			);
		});
	});

	describe('error handling', () => {
		it('should throw if dataset not found', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => [], // Empty array = not found
			});

			await expect(
				fetchLangSmithDataset('missing-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('Dataset "missing-dataset" not found');
		});

		it('should throw on HTTP error when fetching datasets', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => 'Unauthorized',
			});

			await expect(
				fetchLangSmithDataset('test-dataset', { apiKey: 'invalid-key' }),
			).rejects.toThrow('LangSmith API error 401');
		});

		it('should throw on HTTP error when fetching examples', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [{ id: 'dataset-123' }],
				})
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					text: async () => 'Internal Server Error',
				});

			await expect(
				fetchLangSmithDataset('test-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('LangSmith API error 500');
		});

		it('should throw on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				fetchLangSmithDataset('test-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('Failed to fetch LangSmith dataset');
		});

		it('should throw if examples response is not an array', async () => {
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => [{ id: 'dataset-123' }],
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ data: 'not an array' }),
				});

			await expect(
				fetchLangSmithDataset('test-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('LangSmith API response is not an array');
		});
	});
});
