import { describe, expect, it } from 'vitest';
import { calculateRunStats, calculateStats, standardDeviation } from '../../../src/utils/stats.js';

describe('calculateStats', () => {
	it('should calculate basic statistics', () => {
		const values = [0.5, 0.7, 0.8, 0.9, 0.95];

		const stats = calculateStats(values);

		expect(stats.avg).toBeCloseTo(0.77, 2);
		expect(stats.min).toBe(0.5);
		expect(stats.max).toBe(0.95);
	});

	it('should calculate p50 percentile (median)', () => {
		const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

		const stats = calculateStats(values);

		expect(stats.p50).toBe(0.5);
	});

	it('should calculate p95 percentile', () => {
		const values = Array.from({ length: 100 }, (_, i) => (i + 1) / 100);

		const stats = calculateStats(values);

		expect(stats.p95).toBeCloseTo(0.95, 2);
	});

	it('should handle single value', () => {
		const values = [0.75];

		const stats = calculateStats(values);

		expect(stats.avg).toBe(0.75);
		expect(stats.min).toBe(0.75);
		expect(stats.max).toBe(0.75);
		expect(stats.p50).toBe(0.75);
		expect(stats.p95).toBe(0.75);
	});

	it('should handle two values', () => {
		const values = [0.5, 0.9];

		const stats = calculateStats(values);

		expect(stats.avg).toBe(0.7);
		expect(stats.min).toBe(0.5);
		expect(stats.max).toBe(0.9);
		expect(stats.p50).toBe(0.7); // Interpolated median (50% between 0.5 and 0.9)
	});

	it('should handle empty array', () => {
		const values: number[] = [];

		const stats = calculateStats(values);

		expect(stats.avg).toBe(0);
		expect(stats.min).toBe(0);
		expect(stats.max).toBe(0);
		expect(stats.p50).toBe(0);
		expect(stats.p95).toBe(0);
	});

	it('should handle all zeros', () => {
		const values = [0, 0, 0, 0, 0];

		const stats = calculateStats(values);

		expect(stats.avg).toBe(0);
		expect(stats.min).toBe(0);
		expect(stats.max).toBe(0);
		expect(stats.p50).toBe(0);
		expect(stats.p95).toBe(0);
	});

	it('should handle all ones', () => {
		const values = [1, 1, 1, 1, 1];

		const stats = calculateStats(values);

		expect(stats.avg).toBe(1);
		expect(stats.min).toBe(1);
		expect(stats.max).toBe(1);
		expect(stats.p50).toBe(1);
		expect(stats.p95).toBe(1);
	});

	it('should calculate average correctly with decimals', () => {
		const values = [0.333, 0.666, 0.999];

		const stats = calculateStats(values);

		expect(stats.avg).toBeCloseTo(0.666, 2);
	});

	it('should handle negative values', () => {
		const values = [-0.5, 0, 0.5, 1];

		const stats = calculateStats(values);

		expect(stats.avg).toBe(0.25);
		expect(stats.min).toBe(-0.5);
		expect(stats.max).toBe(1);
	});

	it('should sort values for percentile calculation', () => {
		const values = [0.9, 0.1, 0.5, 0.3, 0.7];

		const stats = calculateStats(values);

		expect(stats.min).toBe(0.1);
		expect(stats.max).toBe(0.9);
		expect(stats.p50).toBe(0.5);
	});

	it('should handle large datasets', () => {
		const values = Array.from({ length: 10000 }, (_, i) => Math.random());

		const stats = calculateStats(values);

		expect(stats.avg).toBeGreaterThan(0);
		expect(stats.avg).toBeLessThan(1);
		expect(stats.min).toBeGreaterThanOrEqual(0);
		expect(stats.max).toBeLessThanOrEqual(1);
		expect(stats.p50).toBeGreaterThan(0);
		expect(stats.p50).toBeLessThan(1);
		expect(stats.p95).toBeGreaterThan(stats.p50);
	});
});

describe('standardDeviation', () => {
	it('should calculate standard deviation for uniform values', () => {
		const values = [5, 5, 5, 5, 5];

		const stddev = standardDeviation(values);

		expect(stddev).toBe(0);
	});

	it('should calculate standard deviation for varying values', () => {
		const values = [2, 4, 4, 4, 5, 5, 7, 9];

		const stddev = standardDeviation(values);

		// Expected stddev ≈ 2.0
		expect(stddev).toBeCloseTo(2.0, 1);
	});

	it('should handle single value', () => {
		const values = [10];

		const stddev = standardDeviation(values);

		expect(stddev).toBe(0);
	});

	it('should handle empty array', () => {
		const values: number[] = [];

		const stddev = standardDeviation(values);

		expect(stddev).toBe(0);
	});

	it('should use pre-calculated mean when provided', () => {
		const values = [1, 2, 3, 4, 5];
		const mean = 3;

		const stddev = standardDeviation(values, mean);

		expect(stddev).toBeCloseTo(Math.SQRT2, 2);
	});

	it('should calculate mean automatically when not provided', () => {
		const values = [1, 2, 3, 4, 5];

		const stddev = standardDeviation(values);

		expect(stddev).toBeCloseTo(Math.SQRT2, 2);
	});

	it('should handle negative values', () => {
		const values = [-2, -1, 0, 1, 2];

		const stddev = standardDeviation(values);

		expect(stddev).toBeCloseTo(Math.SQRT2, 2);
	});

	it('should handle decimal values', () => {
		const values = [0.1, 0.2, 0.3, 0.4, 0.5];

		const stddev = standardDeviation(values);

		expect(stddev).toBeCloseTo(0.1414, 3);
	});
});

describe('calculateRunStats', () => {
	it('should calculate comprehensive run statistics', () => {
		const scores = [0.5, 0.7, 0.8, 0.9, 0.95];

		const stats = calculateRunStats(scores);

		expect(stats.mean).toBeCloseTo(0.77, 2);
		expect(stats.stddev).toBeGreaterThan(0);
		expect(stats.min).toBe(0.5);
		expect(stats.max).toBe(0.95);
		expect(stats.p50).toBeCloseTo(0.8, 2);
		expect(stats.p95).toBeGreaterThanOrEqual(0.9); // Interpolated, close to max
		expect(stats.scores).toEqual(scores);
	});

	it('should handle consistent scores (low variance)', () => {
		const scores = [0.85, 0.86, 0.85, 0.86, 0.85];

		const stats = calculateRunStats(scores);

		expect(stats.mean).toBeCloseTo(0.854, 2);
		expect(stats.stddev).toBeLessThan(0.01); // Low variance
		expect(stats.min).toBe(0.85);
		expect(stats.max).toBe(0.86);
	});

	it('should handle high variance scores', () => {
		const scores = [0.1, 0.9, 0.2, 0.8, 0.5];

		const stats = calculateRunStats(scores);

		expect(stats.stddev).toBeGreaterThan(0.3); // High variance
		expect(stats.min).toBe(0.1);
		expect(stats.max).toBe(0.9);
	});

	it('should handle single score', () => {
		const scores = [0.75];

		const stats = calculateRunStats(scores);

		expect(stats.mean).toBe(0.75);
		expect(stats.stddev).toBe(0);
		expect(stats.min).toBe(0.75);
		expect(stats.max).toBe(0.75);
		expect(stats.p50).toBe(0.75);
		expect(stats.p95).toBe(0.75);
	});

	it('should handle empty array', () => {
		const scores: number[] = [];

		const stats = calculateRunStats(scores);

		expect(stats.mean).toBe(0);
		expect(stats.stddev).toBe(0);
		expect(stats.min).toBe(0);
		expect(stats.max).toBe(0);
		expect(stats.p50).toBe(0);
		expect(stats.p95).toBe(0);
		expect(stats.scores).toEqual([]);
	});

	it('should preserve original scores array', () => {
		const scores = [0.3, 0.6, 0.9];

		const stats = calculateRunStats(scores);

		expect(stats.scores).toEqual(scores);
		expect(stats.scores).not.toBe(scores); // Should be a copy
	});

	it('should calculate all required fields', () => {
		const scores = [0.4, 0.5, 0.6, 0.7, 0.8];

		const stats = calculateRunStats(scores);

		expect(stats).toHaveProperty('mean');
		expect(stats).toHaveProperty('stddev');
		expect(stats).toHaveProperty('min');
		expect(stats).toHaveProperty('max');
		expect(stats).toHaveProperty('p50');
		expect(stats).toHaveProperty('p95');
		expect(stats).toHaveProperty('scores');
	});
});
