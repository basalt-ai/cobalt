import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBraintrustDataset } from '../../../../src/datasets/loaders/braintrust.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('fetchBraintrustDataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.BRAINTRUST_API_KEY = undefined;
	});

	describe('authentication', () => {
		it('should use API key from options', async () => {
			const mockData = { events: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchBraintrustDataset('test-project', 'test-dataset', { apiKey: 'test-key' });

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/v1/dataset/test-project/test-dataset/fetch'),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-key',
					}),
				}),
			);
		});

		it('should use API key from environment', async () => {
			process.env.BRAINTRUST_API_KEY = 'env-key';

			const mockData = { events: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchBraintrustDataset('test-project', 'test-dataset');

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
			await expect(fetchBraintrustDataset('test-project', 'test-dataset')).rejects.toThrow(
				'Braintrust API key is required',
			);
		});
	});

	describe('data fetching', () => {
		it('should fetch and transform Braintrust dataset', async () => {
			const mockData = {
				events: [
					{
						id: 'record-1',
						input: 'What is AI?',
						expected: 'Artificial Intelligence',
						metadata: { category: 'tech' },
						tags: ['important'],
					},
					{
						id: 'record-2',
						input: 'What is ML?',
						expected: 'Machine Learning',
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBraintrustDataset('test-project', 'test-dataset', {
				apiKey: 'test-key',
			});

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				input: 'What is AI?',
				expectedOutput: 'Artificial Intelligence',
				metadata: { category: 'tech', tags: ['important'] },
				braintrustId: 'record-1',
			});
			expect(result[1]).toEqual({
				input: 'What is ML?',
				expectedOutput: 'Machine Learning',
				braintrustId: 'record-2',
			});
		});

		it('should handle object inputs by stringifying', async () => {
			const mockData = {
				events: [
					{
						id: 'record-1',
						input: { question: 'What is AI?', context: 'tech' },
						expected: { answer: 'AI definition' },
					},
				],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBraintrustDataset('test-project', 'test-dataset', {
				apiKey: 'test-key',
			});

			expect(result[0].input).toBe(JSON.stringify({ question: 'What is AI?', context: 'tech' }));
			expect(result[0].expectedOutput).toBe(JSON.stringify({ answer: 'AI definition' }));
		});

		it('should support "records" array format', async () => {
			const mockData = {
				records: [{ id: 'record-1', input: 'test', expected: 'output' }],
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			const result = await fetchBraintrustDataset('test-project', 'test-dataset', {
				apiKey: 'test-key',
			});

			expect(result).toHaveLength(1);
		});

		it('should use custom base URL', async () => {
			const mockData = { events: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await fetchBraintrustDataset('test-project', 'test-dataset', {
				apiKey: 'test-key',
				baseUrl: 'https://custom.braintrust.dev',
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom.braintrust.dev/v1/dataset/test-project/test-dataset/fetch',
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
				fetchBraintrustDataset('test-project', 'missing-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('Braintrust API error 404');
		});

		it('should throw on HTTP 401 (unauthorized)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => 'Unauthorized',
			});

			await expect(
				fetchBraintrustDataset('test-project', 'test-dataset', { apiKey: 'invalid-key' }),
			).rejects.toThrow('Braintrust API error 401');
		});

		it('should throw on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				fetchBraintrustDataset('test-project', 'test-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('Failed to fetch Braintrust dataset');
		});

		it('should throw if response is not an array', async () => {
			const mockData = { events: 'not an array' };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockData,
			});

			await expect(
				fetchBraintrustDataset('test-project', 'test-dataset', { apiKey: 'test-key' }),
			).rejects.toThrow('Braintrust API response is not an array');
		});
	});
});
