import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock node:fs
vi.mock('node:fs', () => ({
	existsSync: vi.fn().mockReturnValue(false),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue('{}'),
	writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock hash util to produce predictable keys
vi.mock('../../../src/utils/hash.js', () => ({
	generateHash: vi.fn((...args: string[]) => args.map(String).join('|')),
}));

import { LLMJudgeCache } from '../../../src/storage/cache.js';

describe('LLMJudgeCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('disabled cache', () => {
		it('should return null on get', async () => {
			const cache = new LLMJudgeCache('.cobalt', false);

			const result = await cache.get('prompt', 'input', 'output');

			expect(result).toBeNull();
		});

		it('should be a no-op on set', async () => {
			const cache = new LLMJudgeCache('.cobalt', false);

			await cache.set('prompt', 'input', 'output', { score: 0.9, reason: 'test' });

			const result = await cache.get('prompt', 'input', 'output');
			expect(result).toBeNull();
		});
	});

	describe('enabled cache', () => {
		it('should return null for missing key', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');

			const result = await cache.get('prompt', 'input', 'output');

			expect(result).toBeNull();
		});

		it('should return cached result after set', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');
			const evalResult = { score: 0.9, reason: 'Good answer' };

			await cache.set('prompt', 'input', 'output', evalResult);
			const result = await cache.get('prompt', 'input', 'output');

			expect(result).toEqual(evalResult);
		});

		it('should return null for expired entries', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '1h');
			const evalResult = { score: 0.9, reason: 'test' };

			await cache.set('prompt', 'input', 'output', evalResult);

			// Advance time past TTL
			vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

			const result = await cache.get('prompt', 'input', 'output');
			expect(result).toBeNull();
		});

		it('should return cached result within TTL', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '1h');
			const evalResult = { score: 0.9, reason: 'test' };

			await cache.set('prompt', 'input', 'output', evalResult);

			// Advance time but stay within TTL
			vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

			const result = await cache.get('prompt', 'input', 'output');
			expect(result).toEqual(evalResult);
		});
	});

	describe('TTL parsing', () => {
		it('should parse days', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');
			await cache.set('p', 'i', 'o', { score: 1 });

			// 6 days: still valid
			vi.advanceTimersByTime(6 * 24 * 60 * 60 * 1000);
			expect(await cache.get('p', 'i', 'o')).not.toBeNull();

			// 8 days total: expired
			vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
			expect(await cache.get('p', 'i', 'o')).toBeNull();
		});

		it('should parse hours', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '2h');
			await cache.set('p', 'i', 'o', { score: 1 });

			vi.advanceTimersByTime(1.5 * 60 * 60 * 1000); // 1.5h
			expect(await cache.get('p', 'i', 'o')).not.toBeNull();

			vi.advanceTimersByTime(1 * 60 * 60 * 1000); // 2.5h total
			expect(await cache.get('p', 'i', 'o')).toBeNull();
		});

		it('should parse minutes', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '30m');
			await cache.set('p', 'i', 'o', { score: 1 });

			vi.advanceTimersByTime(31 * 60 * 1000);
			expect(await cache.get('p', 'i', 'o')).toBeNull();
		});

		it('should parse seconds', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '60s');
			await cache.set('p', 'i', 'o', { score: 1 });

			vi.advanceTimersByTime(61 * 1000);
			expect(await cache.get('p', 'i', 'o')).toBeNull();
		});

		it('should default to 7d for invalid TTL', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, 'invalid');
			await cache.set('p', 'i', 'o', { score: 1 });

			// 6 days: still valid
			vi.advanceTimersByTime(6 * 24 * 60 * 60 * 1000);
			expect(await cache.get('p', 'i', 'o')).not.toBeNull();

			// 8 days total: expired
			vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
			expect(await cache.get('p', 'i', 'o')).toBeNull();
		});
	});

	describe('key generation', () => {
		it('should produce same key for same inputs', () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');

			const key1 = cache.generateKey('prompt', 'input', 'output');
			const key2 = cache.generateKey('prompt', 'input', 'output');

			expect(key1).toBe(key2);
		});

		it('should produce different keys for different inputs', () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');

			const key1 = cache.generateKey('prompt A', 'input', 'output');
			const key2 = cache.generateKey('prompt B', 'input', 'output');

			expect(key1).not.toBe(key2);
		});
	});

	describe('flush behavior', () => {
		it('should flush to disk every 10 entries', async () => {
			const { writeFile } = await import('node:fs/promises');
			const cache = new LLMJudgeCache('.cobalt', true, '7d');

			for (let i = 0; i < 10; i++) {
				await cache.set(`prompt-${i}`, 'input', 'output', { score: 0.5 });
			}

			expect(writeFile).toHaveBeenCalled();
		});
	});

	describe('getStats', () => {
		it('should return size and oldest entry', async () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');

			await cache.set('p1', 'i', 'o', { score: 0.8 });
			vi.advanceTimersByTime(1000);
			await cache.set('p2', 'i', 'o', { score: 0.9 });

			const stats = cache.getStats();

			expect(stats.size).toBe(2);
			expect(stats.oldestEntry).toBe(new Date('2025-06-01T00:00:00.000Z').getTime());
		});

		it('should return null oldest for empty cache', () => {
			const cache = new LLMJudgeCache('.cobalt', true, '7d');

			const stats = cache.getStats();

			expect(stats.size).toBe(0);
			expect(stats.oldestEntry).toBeNull();
		});
	});
});
