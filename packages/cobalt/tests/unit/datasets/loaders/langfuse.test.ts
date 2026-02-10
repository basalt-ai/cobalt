import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLangfuseDataset } from '../../../../src/datasets/loaders/langfuse.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('fetchLangfuseDataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.LANGFUSE_API_KEY = undefined;
		process.env.LANGFUSE_PUBLIC_KEY = undefined;
		process.env.LANGFUSE_SECRET_KEY = undefined;
	});

	describe('authentication', () => {
		it('should use API key from options', async () => {
			const mockData = {
				data: [{ id: '1', input: 'test input', expectedOutput: 'test output' }],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' });

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/public/v1/datasets/test-dataset/items'),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-key',
					}),
				}),
			);
		});

		it('should use API key from environment', async () => {
			process.env.LANGFUSE_API_KEY = 'env-key';

			const mockData = { data: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchLangfuseDataset('test-dataset');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer env-key',
					}),
				}),
			);
		});

		it('should use public/secret key pair with Basic auth', async () => {
			const mockData = { data: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchLangfuseDataset('test-dataset', {
				publicKey: 'public-key',
				secretKey: 'secret-key',
			});

			const expectedAuth = `Basic ${Buffer.from('public-key:secret-key').toString('base64')}`;
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: expectedAuth,
					}),
				}),
			);
		});

		it('should throw error if no credentials provided', async () => {
			await expect(fetchLangfuseDataset('test-dataset')).rejects.toThrow(
				'Langfuse API key is required',
			);
		});
	});

	describe('data fetching', () => {
		it('should fetch and transform Langfuse dataset', async () => {
			const mockData = {
				data: [
					{
						id: 'item-1',
						input: 'What is AI?',
						expectedOutput: 'Artificial Intelligence',
						metadata: { category: 'tech' },
					},
					{
						id: 'item-2',
						input: 'What is ML?',
						expectedOutput: 'Machine Learning',
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' });

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				input: 'What is AI?',
				expectedOutput: 'Artificial Intelligence',
				metadata: { category: 'tech' },
				langfuseId: 'item-1',
			});
			expect(result[1]).toEqual({
				input: 'What is ML?',
				expectedOutput: 'Machine Learning',
				langfuseId: 'item-2',
			});
		});

		it('should handle object inputs by stringifying', async () => {
			const mockData = {
				data: [
					{
						id: 'item-1',
						input: { question: 'What is AI?', context: 'technology' },
						expectedOutput: { answer: 'AI definition' },
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' });

			expect(result[0].input).toBe(
				JSON.stringify({ question: 'What is AI?', context: 'technology' }),
			);
			expect(result[0].expectedOutput).toBe(JSON.stringify({ answer: 'AI definition' }));
		});

		it('should support "items" array format', async () => {
			const mockData = {
				items: [{ id: 'item-1', input: 'test', expectedOutput: 'output' }],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' });

			expect(result).toHaveLength(1);
		});

		it('should support direct array format', async () => {
			const mockData = [{ id: 'item-1', input: 'test', expectedOutput: 'output' }];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' });

			expect(result).toHaveLength(1);
		});

		it('should use custom base URL', async () => {
			const mockData = { data: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchLangfuseDataset('test-dataset', {
				apiKey: 'test-key',
				baseUrl: 'https://custom.langfuse.com',
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom.langfuse.com/api/public/v1/datasets/test-dataset/items',
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

			await expect(fetchLangfuseDataset('missing-dataset', { apiKey: 'test-key' })).rejects.toThrow(
				'Langfuse API error 404',
			);
		});

		it('should throw on HTTP 401 (unauthorized)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => 'Unauthorized',
			});

			await expect(fetchLangfuseDataset('test-dataset', { apiKey: 'invalid-key' })).rejects.toThrow(
				'Langfuse API error 401',
			);
		});

		it('should throw on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' })).rejects.toThrow(
				'Failed to fetch Langfuse dataset',
			);
		});

		it('should throw if response is not an array', async () => {
			const mockData = { data: 'not an array' };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await expect(fetchLangfuseDataset('test-dataset', { apiKey: 'test-key' })).rejects.toThrow(
				'Langfuse API response is not an array',
			);
		});
	});
});
