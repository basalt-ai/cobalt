import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRemoteDataset } from '../../../../src/datasets/loaders/remote.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('fetchRemoteDataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('JSON format', () => {
		it('should fetch and parse JSON array', async () => {
			const mockData = [
				{ input: 'Question 1', expectedOutput: 'Answer 1' },
				{ input: 'Question 2', expectedOutput: 'Answer 2' },
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => JSON.stringify(mockData),
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.json');

			expect(result).toEqual(mockData);
			expect(mockFetch).toHaveBeenCalledWith('https://example.com/dataset.json');
		});

		it('should extract items from object with items property', async () => {
			const mockData = {
				items: [
					{ input: 'Question 1', expectedOutput: 'Answer 1' },
					{ input: 'Question 2', expectedOutput: 'Answer 2' },
				],
				metadata: { version: '1.0' },
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => JSON.stringify(mockData),
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.json');

			expect(result).toEqual(mockData.items);
		});

		it('should handle empty array', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => JSON.stringify([]),
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.json');

			expect(result).toEqual([]);
		});
	});

	describe('JSONL format', () => {
		it('should parse JSONL from content-type', async () => {
			const jsonl = `{"input":"Question 1","expectedOutput":"Answer 1"}
{"input":"Question 2","expectedOutput":"Answer 2"}`;

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/jsonl' }),
				text: async () => jsonl,
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.jsonl');

			expect(result).toEqual([
				{ input: 'Question 1', expectedOutput: 'Answer 1' },
				{ input: 'Question 2', expectedOutput: 'Answer 2' },
			]);
		});

		it('should parse JSONL from .jsonl extension', async () => {
			const jsonl = `{"input":"Question 1","expectedOutput":"Answer 1"}
{"input":"Question 2","expectedOutput":"Answer 2"}`;

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'text/plain' }),
				text: async () => jsonl,
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.jsonl');

			expect(result).toEqual([
				{ input: 'Question 1', expectedOutput: 'Answer 1' },
				{ input: 'Question 2', expectedOutput: 'Answer 2' },
			]);
		});

		it('should handle JSONL with empty lines', async () => {
			const jsonl = `{"input":"Question 1"}

{"input":"Question 2"}
`;

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/jsonl' }),
				text: async () => jsonl,
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.jsonl');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ input: 'Question 1' });
			expect(result[1]).toEqual({ input: 'Question 2' });
		});
	});

	describe('error handling', () => {
		it('should throw on HTTP 404', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			});

			await expect(fetchRemoteDataset('https://example.com/not-found.json')).rejects.toThrow(
				'HTTP error 404: Not Found',
			);
		});

		it('should throw on HTTP 500', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			});

			await expect(fetchRemoteDataset('https://example.com/error.json')).rejects.toThrow(
				'HTTP error 500: Internal Server Error',
			);
		});

		it('should throw on invalid JSON', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => 'invalid json{',
			});

			await expect(fetchRemoteDataset('https://example.com/invalid.json')).rejects.toThrow(
				'Failed to parse JSON response',
			);
		});

		it('should throw on invalid JSONL line', async () => {
			const jsonl = `{"valid":"json"}
invalid json line
{"valid":"json"}`;

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/jsonl' }),
				text: async () => jsonl,
			});

			await expect(fetchRemoteDataset('https://example.com/invalid.jsonl')).rejects.toThrow(
				'Failed to parse JSONL line 2',
			);
		});

		it('should throw on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(fetchRemoteDataset('https://example.com/dataset.json')).rejects.toThrow('Network error');
		});

		it('should throw on non-http protocol', async () => {
			await expect(fetchRemoteDataset('ftp://example.com/dataset.json')).rejects.toThrow(
				'Unsupported protocol: ftp:',
			);
		});

		it('should throw on invalid URL', async () => {
			await expect(fetchRemoteDataset('not-a-url')).rejects.toThrow();
		});

		it('should throw if JSON is not array or object with items', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => JSON.stringify({ data: 'not an array' }),
			});

			await expect(fetchRemoteDataset('https://example.com/invalid.json')).rejects.toThrow(
				'Dataset must be an array or object with "items" array property',
			);
		});
	});

	describe('HTTP protocol', () => {
		it('should support HTTP URLs', async () => {
			const mockData = [{ input: 'test' }];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => JSON.stringify(mockData),
			});

			const result = await fetchRemoteDataset('http://example.com/dataset.json');

			expect(result).toEqual(mockData);
		});

		it('should support HTTPS URLs', async () => {
			const mockData = [{ input: 'test' }];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/json' }),
				text: async () => JSON.stringify(mockData),
			});

			const result = await fetchRemoteDataset('https://example.com/dataset.json');

			expect(result).toEqual(mockData);
		});
	});

	describe('content-type detection', () => {
		it('should detect JSONL from application/jsonl', async () => {
			const jsonl = '{"input":"test"}';

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/jsonl' }),
				text: async () => jsonl,
			});

			const result = await fetchRemoteDataset('https://example.com/dataset');

			expect(result).toEqual([{ input: 'test' }]);
		});

		it('should detect JSONL from application/x-jsonl', async () => {
			const jsonl = '{"input":"test"}';

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers({ 'content-type': 'application/x-jsonl' }),
				text: async () => jsonl,
			});

			const result = await fetchRemoteDataset('https://example.com/dataset');

			expect(result).toEqual([{ input: 'test' }]);
		});

		it('should default to JSON when content-type is missing', async () => {
			const mockData = [{ input: 'test' }];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: new Headers(),
				text: async () => JSON.stringify(mockData),
			});

			const result = await fetchRemoteDataset('https://example.com/dataset');

			expect(result).toEqual(mockData);
		});
	});
});
