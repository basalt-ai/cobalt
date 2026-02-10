import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBasaltDataset } from '../../../../src/datasets/loaders/basalt.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('fetchBasaltDataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.BASALT_API_KEY;
	});

	describe('authentication', () => {
		it('should use API key from options', async () => {
			const mockData = { items: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchBasaltDataset('dataset-123', { apiKey: 'test-key' });

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/v1/datasets/dataset-123/items'),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-key',
					}),
				}),
			);
		});

		it('should use API key from environment', async () => {
			process.env.BASALT_API_KEY = 'env-key';

			const mockData = { items: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchBasaltDataset('dataset-123');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer env-key',
					}),
				}),
			);
		});

		it('should throw error if no API key provided', async () => {
			await expect(fetchBasaltDataset('dataset-123')).rejects.toThrow(
				'Basalt API key is required',
			);
		});
	});

	describe('data fetching', () => {
		it('should fetch and transform Basalt dataset', async () => {
			const mockData = {
				items: [
					{
						id: 'item-1',
						input: 'What is AI?',
						output: 'Artificial Intelligence',
						metadata: { category: 'tech' },
					},
					{
						id: 'item-2',
						input: 'What is ML?',
						output: 'Machine Learning',
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBasaltDataset('dataset-123', { apiKey: 'test-key' });

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				input: 'What is AI?',
				expectedOutput: 'Artificial Intelligence',
				metadata: { category: 'tech' },
				basaltId: 'item-1',
			});
			expect(result[1]).toEqual({
				input: 'What is ML?',
				expectedOutput: 'Machine Learning',
				basaltId: 'item-2',
			});
		});

		it('should handle object inputs by stringifying', async () => {
			const mockData = {
				items: [
					{
						id: 'item-1',
						input: { question: 'What is AI?', context: 'tech' },
						output: { answer: 'AI definition' },
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBasaltDataset('dataset-123', { apiKey: 'test-key' });

			expect(result[0].input).toBe(JSON.stringify({ question: 'What is AI?', context: 'tech' }));
			expect(result[0].expectedOutput).toBe(JSON.stringify({ answer: 'AI definition' }));
		});

		it('should support "data" array format', async () => {
			const mockData = {
				data: [{ id: 'item-1', input: 'test', output: 'result' }],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBasaltDataset('dataset-123', { apiKey: 'test-key' });

			expect(result).toHaveLength(1);
		});

		it('should support direct array format', async () => {
			const mockData = [{ id: 'item-1', input: 'test', output: 'result' }];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBasaltDataset('dataset-123', { apiKey: 'test-key' });

			expect(result).toHaveLength(1);
		});

		it('should use custom base URL', async () => {
			const mockData = { items: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchBasaltDataset('dataset-123', {
				apiKey: 'test-key',
				baseUrl: 'https://custom.basalt.ai',
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom.basalt.ai/v1/datasets/dataset-123/items',
				expect.any(Object),
			);
		});
	});

	describe('error handling', () => {
		it('should throw on HTTP 404', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				text: async () => 'Dataset not found',
			});

			await expect(
				fetchBasaltDataset('missing-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('Basalt API error 404');
		});

		it('should throw on HTTP 401 (unauthorized)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => 'Unauthorized',
			});

			await expect(
				fetchBasaltDataset('dataset-123', { apiKey: 'invalid-key' }),
			).rejects.toThrow('Basalt API error 401');
		});

		it('should throw on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				fetchBasaltDataset('dataset-123', { apiKey: 'test-key' }),
			).rejects.toThrow('Failed to fetch Basalt dataset');
		});

		it('should throw if response is not an array', async () => {
			const mockData = { items: 'not an array' };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await expect(
				fetchBasaltDataset('dataset-123', { apiKey: 'test-key' }),
			).rejects.toThrow('Basalt API response is not an array');
		});
	});
});
